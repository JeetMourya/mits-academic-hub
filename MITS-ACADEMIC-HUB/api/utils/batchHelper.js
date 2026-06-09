/**
 * Batch Helper — Enrolment-to-Batch Detection & Dynamic Session Generation
 * 
 * Handles all future batches automatically. No manual config needed.
 * 
 * Enrollment format: BTIT<YY>O<XXXX>
 *   BTIT24O1040 → Batch 2024
 *   BTIT25O1063 → Batch 2025
 *   BTIT30O1001 → Batch 2030
 * 
 * IUMS Session Codes:
 *   Odd semesters (1,3,5,7): 11<YEAR>   → 112025 = Nov 2025
 *   Even semesters (2,4,6,8): 04<YEAR>  → 042026 = Apr 2026
 */

/**
 * Extract batch year from enrollment.
 * Supports BTIT pattern and generic 8-14 char enrollments.
 */
function getBatchFromEnrollment(enrollment) {
  const cleaned = String(enrollment).toUpperCase().trim();

  // Primary: BTIT<YY>O pattern (B.Tech IT)
  const btechMatch = cleaned.match(/^BTIT(\d{2})O/);
  if (btechMatch) {
    return 2000 + parseInt(btechMatch[1], 10);
  }

  // Fallback: Any enrollment with digits at positions 4-5 (e.g., 0108CS221042 → 22 → 2022)
  const genericMatch = cleaned.match(/^\d{4}[A-Z]{2}(\d{2})\d{4}$/);
  if (genericMatch) {
    return 2000 + parseInt(genericMatch[1], 10);
  }

  // Last resort: try extracting any 2-digit year-like number after 4th char
  const fallbackMatch = cleaned.match(/^.{4}(\d{2})/);
  if (fallbackMatch) {
    const year = 2000 + parseInt(fallbackMatch[1], 10);
    if (year >= 2020 && year <= 2040) return year;
  }

  throw new Error(
    'Could not detect batch year from enrollment. Expected format: BTIT<YY>O... or DDDDBBYYDDDD'
  );
}

/**
 * Calculate the academic year offset and session for a given semester.
 * 
 * Semester timeline for batch starting in year Y:
 *   Sem 1 → Nov Y        (batch year + 0)
 *   Sem 2 → Apr Y+1      (batch year + 1)
 *   Sem 3 → Nov Y+1      (batch year + 1)
 *   Sem 4 → Apr Y+2      (batch year + 2)
 *   Sem 5 → Nov Y+2      (batch year + 2)
 *   Sem 6 → Apr Y+3      (batch year + 3)
 *   Sem 7 → Nov Y+3      (batch year + 3)
 *   Sem 8 → Apr Y+4      (batch year + 4)
 */
function generateSemesterInfo(batchYear, semesterNumber) {
  // For odd sem (1,3,5,7): year = batchYear + floor((sem-1)/2)
  // For even sem (2,4,6,8): year = batchYear + sem/2
  const offset = Math.floor((semesterNumber - 1) / 2);
  let year = batchYear + offset;
  if (semesterNumber % 2 === 0) {
    year = batchYear + semesterNumber / 2;
  }

  const isOdd = semesterNumber % 2 === 1;
  const month = isOdd ? 'Nov' : 'Apr';
  const sessionCode = isOdd ? `11${year}` : `04${year}`;

  return {
    semester: semesterNumber,
    month,
    year,
    sessionCode,
    displayName: `Semester ${semesterNumber} (${month} ${year})`,
    shortLabel: `Sem ${semesterNumber} · ${month} ${year}`,
  };
}

/**
 * Generate all 8 semesters for a given enrollment.
 */
function getAllSemesters(enrollment) {
  const batchYear = getBatchFromEnrollment(enrollment);
  const semesters = [];
  for (let s = 1; s <= 8; s++) {
    semesters.push(generateSemesterInfo(batchYear, s));
  }
  return semesters;
}

/**
 * Build the correct IUMS result URL dynamically.
 */
function buildIumsUrl(enrollment, semesterNumber) {
  const batchYear = getBatchFromEnrollment(enrollment);
  const semInfo = generateSemesterInfo(batchYear, semesterNumber);
  return `https://iums.mitsgwalior.in/ViewSC.aspx?U2bJdzw70jtQ3d=${encodeURIComponent(enrollment)}&U3bJdzw70jtQ4d=${semesterNumber}&U4bJdzw70jtQ5d=${semInfo.sessionCode}`;
}

/**
 * Get the current active semester range for a batch.
 * Returns which semesters are likely available now (not in the future).
 */
function getAvailableSemesters(enrollment) {
  const allSemesters = getAllSemesters(enrollment);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // A semester is "available" if its exam month has passed (or is current)
  // We add a 3-month buffer after exam month for result publication
  return allSemesters.filter((sem) => {
    const semMonth = sem.month === 'Nov' ? 11 : 4;
    const semDate = new Date(sem.year, semMonth - 1, 1);
    // Add 3 months for result processing
    semDate.setMonth(semDate.getMonth() + 3);
    return semDate <= now;
  });
}

module.exports = {
  getBatchFromEnrollment,
  generateSemesterInfo,
  getAllSemesters,
  buildIumsUrl,
  getAvailableSemesters,
};
