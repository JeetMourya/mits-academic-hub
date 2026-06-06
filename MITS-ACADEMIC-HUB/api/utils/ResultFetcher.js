/**
 * Results Fetching & Parsing Utility
 */
const axios = require('axios');
const cheerio = require('cheerio');

class ResultFetcher {
  constructor() {
    this.baseUrl = process.env.IUMS_BASE_URL || 'https://iums.mitsgwalior.in';
    this.timeout = parseInt(process.env.IUMS_FETCH_TIMEOUT) || 10000;
  }

  /**
   * Parse IUMS result page HTML
   */
  parseResultHTML(html) {
    try {
      const $ = cheerio.load(html);
      
      const result = {
        studentName: '',
        enrollmentNumber: '',
        semester: 0,
        sgpa: 0,
        status: 'Pass',
        subjects: [],
      };

      // Extract student info (adjust selectors based on actual IUMS HTML structure)
      result.studentName = $('td:contains("Name")')?.next?.()?.text?.() || '';
      result.enrollmentNumber = $('td:contains("Roll")')?.next?.()?.text?.() || '';
      result.semester = parseInt($('td:contains("Semester")')?.next?.()?.text?.()) || 0;
      result.sgpa = parseFloat($('td:contains("SGPA")')?.next?.()?.text?.()) || 0;

      // Parse subject table
      const subjectRows = $('table tr').slice(1);
      
      subjectRows.each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 4) {
          result.subjects.push({
            code: $(cells[0]).text?.().trim() || '',
            name: $(cells[1]).text?.().trim() || '',
            grade: $(cells[3]).text?.().trim() || '',
            credits: parseFloat($(cells[2]).text?.()) || 0,
            gpa: this.gradeToGPA($(cells[3]).text?.().trim()),
          });
        }
      });

      result.status = result.subjects.every(s => !['F', 'AB'].includes(s.grade)) ? 'Pass' : 'Fail';

      return result;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error('Failed to parse result HTML');
    }
  }

  /**
   * Convert grade to GPA
   */
  gradeToGPA(grade) {
    const gradeMap = {
      'A+': 4.0, 'A': 3.7, 'A-': 3.3,
      'B+': 3.0, 'B': 2.7, 'B-': 2.3,
      'C+': 2.0, 'C': 1.7, 'C-': 1.3,
      'D': 1.0, 'F': 0.0, 'AB': 0.0,
    };
    return gradeMap[grade?.toUpperCase()] || 0;
  }

  /**
   * Fetch results from IUMS
   */
  async fetchResults(enrollmentNumber, semesterUrl) {
    try {
      const url = `${this.baseUrl}/${semesterUrl}`.replace('{ENROLLMENT}', enrollmentNumber);

      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'MITS-Academic-Hub/1.0',
        },
      });

      if (!response.data) {
        throw new Error('Empty response from IUMS');
      }

      const parsedResult = this.parseResultHTML(response.data);

      // Validate result
      if (!parsedResult.studentName || !parsedResult.enrollmentNumber) {
        throw new Error('Could not extract student information from result');
      }

      return {
        success: true,
        data: parsedResult,
        fetchedAt: new Date(),
      };
    } catch (error) {
      console.error('Fetch error:', error.message);
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Results not found for this enrollment number',
          code: 'NOT_FOUND',
        };
      }

      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Request timeout. IUMS server is taking too long to respond.',
          code: 'TIMEOUT',
        };
      }

      return {
        success: false,
        error: 'Failed to fetch results. Please try again later.',
        code: 'FETCH_ERROR',
      };
    }
  }
}

module.exports = ResultFetcher;
