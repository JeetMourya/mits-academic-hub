/**
 * Seed default semesters from data/links.json when the database is empty.
 */
const fs = require('fs');
const path = require('path');
const Semester = require('../models/Semester');

async function seedDefaultSemesters() {
  try {
    const linksPath = path.join(__dirname, '..', '..', 'data', 'links.json');
    if (!fs.existsSync(linksPath)) {
      console.warn('links.json file not found at:', linksPath);
      return;
    }

    const fileData = fs.readFileSync(linksPath, 'utf8');
    const linksData = JSON.parse(fileData);

    if (!linksData.semesters || linksData.semesters.length === 0) {
      console.warn('No semesters found in links.json to seed');
      return;
    }

    let seedCount = 0;
    for (const sem of linksData.semesters) {
      const exists = await Semester.findOne({ semesterNumber: sem.id });
      if (!exists) {
        await Semester.create({
          name: sem.name,
          semesterNumber: sem.id,
          resultUrl: sem.urlTemplate,
          urlTemplate: sem.urlTemplate,
          isActive: sem.active !== false,
          description: sem.session || '',
        });
        seedCount++;
      }
    }

    if (seedCount > 0) {
      console.log(`✓ Seeded ${seedCount} default semesters from links.json`);
    } else {
      console.log('✓ Semester seeding checked: all semesters already present');
    }
  } catch (err) {
    console.error('Failed to seed default semesters:', err.message);
  }
}

module.exports = { seedDefaultSemesters };
