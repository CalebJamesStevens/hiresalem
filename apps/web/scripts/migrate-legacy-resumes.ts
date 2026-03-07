import { readFile, unlink } from "node:fs/promises"
import path from "node:path"

import { eq, like } from "drizzle-orm"

import { db } from "../lib/db"
import {
  getLegacyResumeContentType,
  getLegacyResumeFilename,
  uploadResumeFile
} from "../lib/resume-storage"
import { applications } from "@repo/db/schema/applications"

const deleteLegacyFiles = process.env.DELETE_LEGACY_RESUMES === "true"

async function main() {
  const rows = await db
    .select({
      id: applications.id,
      resume: applications.resume
    })
    .from(applications)
    .where(like(applications.resume, "/uploads/resumes/%"))

  if (rows.length === 0) {
    console.log("No legacy resumes found.")
    return
  }

  let migratedCount = 0
  let failedCount = 0

  for (const row of rows) {
    if (!row.resume) {
      continue
    }

    const legacyFilename = path.basename(row.resume)
    const legacyPath = path.join(process.cwd(), "public", "uploads", "resumes", legacyFilename)

    try {
      const buffer = await readFile(legacyPath)
      const uploadedKey = await uploadResumeFile(
        new File([buffer], getLegacyResumeFilename(row.resume), {
          type: getLegacyResumeContentType(row.resume)
        })
      )

      await db
        .update(applications)
        .set({ resume: uploadedKey })
        .where(eq(applications.id, row.id))

      if (deleteLegacyFiles) {
        await unlink(legacyPath).catch(() => undefined)
      }

      migratedCount += 1
      console.log(`Migrated application ${row.id} -> ${uploadedKey}`)
    } catch (error) {
      failedCount += 1
      console.error(`Failed to migrate application ${row.id}:`, error)
    }
  }

  console.log(`Finished migrating resumes. Success: ${migratedCount}. Failed: ${failedCount}.`)

  if (failedCount > 0) {
    process.exitCode = 1
  }
}

void main()
