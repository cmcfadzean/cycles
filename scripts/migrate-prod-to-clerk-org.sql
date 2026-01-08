-- Migration script to rename clerkUserId to clerkOrganizationId
-- Run this on your production PostgreSQL database BEFORE deploying the new code

-- Step 1: Rename the column
ALTER TABLE "Organization" RENAME COLUMN "clerkUserId" TO "clerkOrganizationId";

-- Step 2: Update the value to your Clerk Organization ID
-- Replace 'org_XXXXXXXXXX' with your actual Clerk Organization ID from the Clerk dashboard
UPDATE "Organization" SET "clerkOrganizationId" = 'org_XXXXXXXXXX' WHERE "clerkOrganizationId" IS NOT NULL;

-- Verify the change
SELECT id, "clerkOrganizationId", name FROM "Organization";

