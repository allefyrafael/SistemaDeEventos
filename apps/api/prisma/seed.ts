/* eslint-disable no-console */
import { PrismaClient, UserType, StudentKind, EventMemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_ADMIN_CPF = '00000000000';
const DEMO_ADMIN_SENHA = 'admin1234';
const DEMO_EVENT_SLUG = 'evento-demo-2026';

async function main() {
  console.log('>> Seed start');

  // 1) Admin default
  const senhaHash = await bcrypt.hash(DEMO_ADMIN_SENHA, 12);
  const admin = await prisma.user.upsert({
    where: { cpf: DEMO_ADMIN_CPF },
    update: {},
    create: {
      nome: 'Admin Demo',
      cpf: DEMO_ADMIN_CPF,
      email: 'admin@eventpass.dev',
      senhaHash,
      tipoPerfil: UserType.ADMIN,
    },
  });
  console.log(`admin: ${admin.email} / senha: ${DEMO_ADMIN_SENHA}`);

  // 2) Evento demo
  const event = await prisma.event.upsert({
    where: { slug: DEMO_EVENT_SLUG },
    update: {},
    create: {
      nome: 'Evento Demo 2026',
      slug: DEMO_EVENT_SLUG,
      descricao: 'Evento demo para desenvolvimento local',
      startsAt: new Date(Date.now() + 24 * 3600_000),
      endsAt: new Date(Date.now() + 72 * 3600_000),
      status: 'PUBLISHED',
      config: {
        modules: [
          'passport',
          'qr_scan',
          'feedback',
          'companies',
          'student_profile',
          'dashboard_live',
          'exports_csv',
          'certificate',
        ],
        theme: { primary: '#0057A3' },
        passport: { requiredStamps: 3 },
        qr_scan: { tokenTtlSeconds: 30, rotateEverySeconds: 20 },
        feedback: { mandatory: true, minQuestions: 3 },
      },
    },
  });
  await prisma.eventMember.upsert({
    where: {
      eventId_userId_role: {
        eventId: event.id,
        userId: admin.id,
        role: EventMemberRole.ADMIN,
      },
    },
    update: {},
    create: { eventId: event.id, userId: admin.id, role: EventMemberRole.ADMIN },
  });

  // 3) Duas empresas com 2 responsaveis cada (login da empresa precisa de 2 CPFs distintos)
  const empresas = [
    {
      nome: 'TechCo',
      slug: 'techco',
      responsaveis: [
        { nome: 'Responsavel TechCo 1', cpf: '11111111111', email: 'techco1@demo.com' },
        { nome: 'Responsavel TechCo 2', cpf: '11111111112', email: 'techco2@demo.com' },
      ],
    },
    {
      nome: 'Carreiras Hub',
      slug: 'carreiras-hub',
      responsaveis: [
        { nome: 'Responsavel Carreiras 1', cpf: '22222222222', email: 'carreiras1@demo.com' },
        { nome: 'Responsavel Carreiras 2', cpf: '22222222223', email: 'carreiras2@demo.com' },
      ],
    },
  ];
  const createdCompanies: { id: string; nome: string; responsaveis: string[] }[] = [];
  for (const e of empresas) {
    const company = await prisma.company.upsert({
      where: { eventId_slug: { eventId: event.id, slug: e.slug } },
      update: {},
      create: {
        eventId: event.id,
        nome: e.nome,
        slug: e.slug,
        meta: { stand: e.slug.toUpperCase() },
      },
    });
    for (const resp of e.responsaveis) {
      const respUser = await prisma.user.upsert({
        where: { cpf: resp.cpf },
        update: { tipoPerfil: UserType.COMPANY, email: resp.email },
        create: {
          nome: resp.nome,
          cpf: resp.cpf,
          email: resp.email,
          tipoPerfil: UserType.COMPANY,
        },
      });
      await prisma.companyResponsible.upsert({
        where: { companyId_userId: { companyId: company.id, userId: respUser.id } },
        update: {},
        create: { companyId: company.id, userId: respUser.id },
      });
      await prisma.eventMember.upsert({
        where: {
          eventId_userId_role: {
            eventId: event.id,
            userId: respUser.id,
            role: EventMemberRole.COMPANY_REP,
          },
        },
        update: {},
        create: {
          eventId: event.id,
          userId: respUser.id,
          role: EventMemberRole.COMPANY_REP,
        },
      });
    }
    createdCompanies.push({
      id: company.id,
      nome: company.nome,
      responsaveis: e.responsaveis.map((r) => r.cpf),
    });
  }
  console.log('empresas criadas:', createdCompanies.map((c) => c.nome).join(', '));

  // 4) 3 stamps demo (2 livres + 1 restrito a uma empresa especifica via
  // a tabela junção StampConfigCompany).
  const carreirasHub = createdCompanies.find((c) => c.nome === 'Carreiras Hub');
  const stampsData = [
    { titulo: 'Visita Empresa A', ordem: 1, authorizedCompanyIds: [] as string[] },
    { titulo: 'Visita Empresa B', ordem: 2, authorizedCompanyIds: [] as string[] },
    {
      titulo: 'Carreiras Hub',
      ordem: 3,
      authorizedCompanyIds: carreirasHub ? [carreirasHub.id] : [],
    },
  ];
  for (const s of stampsData) {
    const exists = await prisma.stampConfig.findFirst({
      where: { eventId: event.id, titulo: s.titulo },
    });
    if (!exists) {
      await prisma.stampConfig.create({
        data: {
          eventId: event.id,
          titulo: s.titulo,
          ordem: s.ordem,
          obrigatorio: true,
          authorizedCompanies: {
            create: s.authorizedCompanyIds.map((companyId) => ({ companyId })),
          },
        },
      });
    }
  }

  // 5) Dois estudantes demo (internos com matricula no padrao UC########)
  const alunos = [
    { matricula: 'UC24101130', cpf: '33333333333', nome: 'Aluno Demo 1', email: 'aluno1@demo.com' },
    { matricula: 'UC24101131', cpf: '44444444444', nome: 'Aluno Demo 2', email: 'aluno2@demo.com' },
  ];
  for (const a of alunos) {
    const u = await prisma.user.upsert({
      where: { cpf: a.cpf },
      update: {},
      create: {
        nome: a.nome,
        cpf: a.cpf,
        email: a.email,
        matricula: a.matricula,
        tipoPerfil: UserType.STUDENT,
        studentKind: StudentKind.INTERNAL,
      },
    });
    await prisma.eventMember.upsert({
      where: {
        eventId_userId_role: {
          eventId: event.id,
          userId: u.id,
          role: EventMemberRole.STUDENT,
        },
      },
      update: {},
      create: { eventId: event.id, userId: u.id, role: EventMemberRole.STUDENT },
    });
  }

  console.log('>> Seed done');
  console.log('--- Credenciais para teste ---');
  console.log(`  ADMIN:     CPF ${DEMO_ADMIN_CPF} / senha ${DEMO_ADMIN_SENHA}`);
  console.log('  ESTUDANTE: matricula UC24101130 / CPF 33333333333');
  console.log('  EMPRESA:   cpfEmpresa 11111111111 + cpfResponsavel 11111111112 (TechCo)');
  console.log('             cpfEmpresa 22222222222 + cpfResponsavel 22222222223 (Carreiras Hub)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
