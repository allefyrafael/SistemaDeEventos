-- CreateEnum
CREATE TYPE "MapLocationKind" AS ENUM ('COMPANY_STAND', 'THEATER', 'ROOM', 'AREA', 'POI', 'CUSTOM');

-- CreateTable
CREATE TABLE "venue_maps" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "titulo" TEXT,
    "backgroundUrl" TEXT,
    "viewportWidth" INTEGER NOT NULL DEFAULT 1200,
    "viewportHeight" INTEGER NOT NULL DEFAULT 800,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_locations" (
    "id" TEXT NOT NULL,
    "venueMapId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "MapLocationKind" NOT NULL,
    "companyId" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "corHex" TEXT,
    "icone" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "larguraPct" DOUBLE PRECISION,
    "alturaPct" DOUBLE PRECISION,
    "rotacaoDeg" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "palestrante" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacidade" INTEGER,
    "permitirInscricao" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_registrations" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venue_maps_eventId_key" ON "venue_maps"("eventId");

-- CreateIndex
CREATE INDEX "map_locations_venueMapId_kind_idx" ON "map_locations"("venueMapId", "kind");

-- CreateIndex
CREATE INDEX "map_locations_eventId_kind_idx" ON "map_locations"("eventId", "kind");

-- CreateIndex
CREATE INDEX "activities_eventId_startsAt_idx" ON "activities"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "activities_locationId_startsAt_idx" ON "activities"("locationId", "startsAt");

-- CreateIndex
CREATE INDEX "activity_registrations_userId_idx" ON "activity_registrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_registrations_activityId_userId_key" ON "activity_registrations"("activityId", "userId");

-- AddForeignKey
ALTER TABLE "venue_maps" ADD CONSTRAINT "venue_maps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_locations" ADD CONSTRAINT "map_locations_venueMapId_fkey" FOREIGN KEY ("venueMapId") REFERENCES "venue_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_locations" ADD CONSTRAINT "map_locations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_locations" ADD CONSTRAINT "map_locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "map_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_registrations" ADD CONSTRAINT "activity_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
