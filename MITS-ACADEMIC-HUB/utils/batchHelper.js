/**
 * Batch Helper — Enrolment-to-Batch Detection & Dynamic Session Generation
 * (Frontend mirror of api/utils/batchHelper.js)
 * 
 * Handles all future batches automatically. No manual config needed.
 * 
 * Enrollment format: BTIT<YY>O<XXXX>
 *   BTIT24O1040 → Batch 2024
 *   BTIT25O1063 → Batch 2025
 *   BTIT30O1001 → Batch 2030
 */

function getBatchFromEnrollment(enrollment) {
  const cleaned = String(enrollment).toUpperCase().trim();
  const btechMatch = cleaned.match(/^BTIT(\d{2})O/);
  if (btechMatch) {
    return 2000 + parseInt(btechMatch[1], 10);
  }
  const genericMatch = cleaned.match(/^\d{4}[A-Z]{2}(\d{2})\d{4}$/);
  if (genericMatch) {
    return 2000 + parseInt(genericMatch[1], 10);
  }
  const fallbackMatch = cleaned.match(/^.{4}(\d{2})/);
  if (fallbackMatch) {
    const year = 2000 + parseInt(fallbackMatch[1], 10);
    if (year >= 2020 && year <= 2040) return year;
  }
  throw new Error('Could not detect batch year from enrollment. Expected format: BTIT<YY>O... or DDDDBBYYDDDD');
}

function generateSemesterInfo(batchYear, semesterNumber) {
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

function getAllSemesters(enrollment) {
  const batchYear = getBatchFromEnrollment(enrollment);
  const semesters = [];
  for (let s = 1; s <= 8; s++) {
    semesters.push(generateSemesterInfo(batchYear, s));
  }
  return semesters;
}

function buildIumsUrl(enrollment, semesterNumber) {
  const batchYear = getBatchFromEnrollment(enrollment);
  const semInfo = generateSemesterInfo(batchYear, semesterNumber);
  return `https://iums.mitsgwalior.in/ViewSC.aspx?U2bJdzw70jtQ3d=${encodeURIComponent(enrollment)}&U3bJdzw70jtQ4d=${semesterNumber}&U4bJdzw70jtQ5d=${semInfo.sessionCode}`;
}

function getAvailableSemesters(enrollment) {
  const allSemesters = getAllSemesters(enrollment);
  const now = new Date();
  return allSemesters.filter((sem) => {
    const semMonth = sem.month === 'Nov' ? 11 : 4;
    const semDate = new Date(sem.year, semMonth - 1, 1);
    semDate.setMonth(semDate.getMonth() + 3);
    return semDate <= now;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getBatchFromEnrollment, generateSemesterInfo, getAllSemesters, buildIumsUrl, getAvailableSemesters };
}
