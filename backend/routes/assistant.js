const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { parseNaturalLanguageQuery } = require('../services/nlp');
const { parseSearchWithGemini } = require('../services/gemini');

// AI Search Assistant (Powered by Google Gemini & Grounded in DB)
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query text is required.' });
    }

    // Attempt Gemini-powered extraction first
    let geminiParsed = null;
    try {
      geminiParsed = await parseSearchWithGemini(query);
    } catch (e) {
      console.warn('Gemini NLP fallback:', e.message);
    }

    const localParsed = parseNaturalLanguageQuery(query);
    const parsed = {
      category: geminiParsed?.category && geminiParsed.category !== 'Other' ? geminiParsed.category : localParsed.category,
      color: geminiParsed?.color || localParsed.color,
      building: geminiParsed?.location || localParsed.building,
      keywords: geminiParsed?.keywords?.length ? geminiParsed.keywords : localParsed.keywords
    };

    let sql = `
      SELECT 
        i.id, i.type, i.title, i.description, i.category, i.color, 
        i.brand, i.model, i.image, i.location, i.building, i.floor,
        i.event_time, i.status
      FROM items i
      WHERE status != 'RECOVERED'
    `;
    const params = [];

    // Filter by parsed category
    if (parsed.category) {
      sql += ` AND i.category = ?`;
      params.push(parsed.category);
    }

    // Filter or boost by building
    if (parsed.building) {
      sql += ` AND i.building = ?`;
      params.push(parsed.building);
    }

    // Filter or boost by color
    if (parsed.color) {
      sql += ` AND LOWER(i.color) LIKE ?`;
      params.push(`%${parsed.color}%`);
    }

    // Keyword matching on title/description
    if (parsed.keywords.length > 0) {
      const keywordClauses = parsed.keywords.map(() => `(LOWER(i.title) LIKE ? OR LOWER(i.description) LIKE ?)`).join(' OR ');
      sql += ` AND (${keywordClauses})`;
      parsed.keywords.forEach(k => {
        params.push(`%${k}%`, `%${k}%`);
      });
    }

    sql += ` ORDER BY i.created_at DESC LIMIT 10`;
    let results = db.prepare(sql).all(...params);

    // Fallback: If strict query gave 0 results, relax criteria to category or keyword
    if (results.length === 0 && (parsed.category || parsed.keywords.length > 0)) {
      let relaxedSql = `SELECT * FROM items WHERE status != 'RECOVERED'`;
      const relaxedParams = [];
      if (parsed.category) {
        relaxedSql += ` AND category = ?`;
        relaxedParams.push(parsed.category);
      }
      relaxedSql += ` LIMIT 6`;
      results = db.prepare(relaxedSql).all(...relaxedParams);
    }

    res.json({
      originalQuery: query,
      extractedParameters: {
        category: parsed.category || 'Not specified',
        color: parsed.color || 'Not specified',
        location: parsed.building || 'Campus Wide',
        keywords: parsed.keywords
      },
      results,
      count: results.length,
      groundedMessage: results.length > 0 
        ? `Found ${results.length} active items matching your criteria in the campus registry.`
        : `No items strictly matching your description were found. We will alert you if an item is logged.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
