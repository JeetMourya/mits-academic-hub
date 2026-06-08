// utils/batchHelper.js
function getBatchFromEnrollment(enrollment) {
  const regex = /^BTIT(\d{2})O/;
  const match = enrollment.match(regex);
  if (!match) throw new Error('Invalid enrollment number. Expected format: BTIT<YY>O...');
  const twoDigitYear = parseInt(match[1], 10);
  return 2000 + twoDigitYear;
}

function generateSemesterInfo(batchYear, semesterNumber) {
  const offset = Math.floor((semesterNumber - 1) / 2);
  let year = batchYear + offset;
  if (semesterNumber % 2 === 0) year += 1;
  const month = semesterNumber % 2 === 1 ? 'Nov' : 'Apr';
  const sessionCode = `${month === 'Apr' ? '04' : '11'}${year}`;
  return {
    semester: semesterNumber,
    month,
    year,
    sessionCode,
    displayName: `Semester ${semesterNumber} (${month} ${year})`
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
  return `https://iums.mitsgwalior.in/ViewSC.aspx?U2bJdzw70jtQ3d=${enrollment}&U3bJdzw70jtQ4d=${semesterNumber}&U4bJdzw70jtQ5d=${semInfo.sessionCode}`;
}

module.exports = { getBatchFromEnrollment, generateSemesterInfo, getAllSemesters, buildIumsUrl };
