/**
 * Results Fetching & Parsing Utility
 */
const axios = require('axios');
const cheerio = require('cheerio');
const HttpsProxyAgent = require('https-proxy-agent');

class ResultFetcher {
  constructor() {
    this.baseUrl = process.env.IUMS_BASE_URL || 'https://iums.mitsgwalior.in';
    this.timeout = 60000;
    this.proxyUrl = process.env.WEBSHARE_PROXY;
  }

  parseResultHTML(html) {
    const $ = cheerio.load(html);

    let rawStatus = $('[id^="rptCustomers_lbloverallresult_"]').first().text().trim();
    let status = rawStatus.replace(/Result\s*:\s*/i, '').trim();

    let rawSgpa = $('[id^="rptCustomers_lbltotalobtmarks_"]').first().text().trim();
    let sgpa = parseFloat(rawSgpa) || 0;

    const result = {
      studentName: $('#lblStudentName').text().trim(),
      enrollmentNumber: $('#lblEnrollment').text().trim(),
      semester: 1,
      sgpa,
      status,
      subjects: []
    };

    const semText = $('[id^="rptCustomers_lblSemester_"]').first().text().trim();
    if (semText) {
      const match = semText.match(/(\d+)/);
      if (match) {
        result.semester = parseInt(match[1], 10);
      }
    }

    $('[id^="rptCustomers_rptOrders_"]').filter((i, el) => {
      return $(el).attr('id').includes('lblpaper_code_');
    }).each((i, el) => {
      const id = $(el).attr('id');
      const match = id.match(/rptCustomers_rptOrders_(\d+)_lblpaper_code_(\d+)/);

      if (match) {
        const orderIndex = match[1];
        const paperIndex = match[2];

        const code = $(el).text().trim();
        const name = $(`#rptCustomers_rptOrders_${orderIndex}_lblpaper_name_${paperIndex}`).text().trim();
        const grade = $(`#rptCustomers_rptOrders_${orderIndex}_lblobt_marks_${paperIndex}`).text().trim();

        if (code) {
          result.subjects.push({
            code,
            name,
            grade
          });
        }
      }
    });

    return result;
  }

  /**
   * Fetch results from a full URL with PROXY support
   */
  async fetchFromUrl(url) {
    try {
      console.log('[FETCH] URL:', url);

      // PROXY SETUP
      const agent = this.proxyUrl 
        ? new HttpsProxyAgent(this.proxyUrl)
        : null;

      console.log('[PROXY]', this.proxyUrl ? '✅ ENABLED' : '❌ NOT SET');

      const response = await axios.get(url, {
        timeout: this.timeout,
        httpAgent: agent,
        httpsAgent: agent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });

      if (!response.data || typeof response.data !== 'string') {
        return {
          success: false,
          error: 'Empty response from IUMS',
          code: 'EMPTY_RESPONSE',
        };
      }

      const parsedResult = this.parseResultHTML(response.data);

      if (!parsedResult.studentName && parsedResult.subjects.length === 0) {
        return {
          success: false,
          error: 'No result found for this enrollment number',
          code: 'NOT_FOUND',
        };
      }

      console.log('[✅ SUCCESS] Results fetched successfully');

      return {
        success: true,
        data: parsedResult,
        fetchedAt: new Date(),
      };
    } catch (error) {
      console.error('[❌ FETCH ERROR]', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url,
      });

      return {
        success: false,
        error:
          error.code === 'ECONNABORTED'
            ? 'IUMS server is taking too long to respond'
            : `Could not reach IUMS: ${error.message}`,
        code: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Legacy method
   */
  async fetchResults(enrollmentNumber, semesterUrl) {
    const url = `${this.baseUrl}/${semesterUrl}`.replace(
      '{ENROLLMENT}',
      enrollmentNumber
    );

    return this.fetchFromUrl(url);
  }
}

module.exports = ResultFetcher;