const Response = require('../models/Response.model');
const Form = require('../models/Form.model');

const PERIOD_TO_DAYS = {
  '7d': 7,
  '15d': 15,
  '30d': 30,
  '60d': 60,
  '90d': 90,
  all: 3650,
};

const getDaysForPeriod = (period = '30d') => PERIOD_TO_DAYS[period] || PERIOD_TO_DAYS['30d'];

const toCountMap = (items = []) => items.reduce((acc, item) => {
  if (item?._id) {
    acc[item._id] = item.count;
  }
  return acc;
}, {});

const formatTrendLabel = (value) => new Date(value).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildInsights = ({ totalResponses, validResponses, spamResponses, sentimentCounts, trendRows }) => {
  const sentiment = {
    positive: sentimentCounts.positive || 0,
    neutral: sentimentCounts.neutral || 0,
    negative: sentimentCounts.negative || 0,
    unknown: sentimentCounts.unknown || 0,
  };

  const topTrend = trendRows.reduce((best, row) => (row.count > best.count ? row : best), trendRows[0] || { _id: null, count: 0 });
  const firstHalf = trendRows.slice(0, Math.ceil(trendRows.length / 2)).map((row) => row.count);
  const secondHalf = trendRows.slice(Math.ceil(trendRows.length / 2)).map((row) => row.count);
  const firstHalfAverage = average(firstHalf);
  const secondHalfAverage = average(secondHalf);
  const dropOffRatio = firstHalfAverage > 0 ? secondHalfAverage / firstHalfAverage : 1;
  const hasDropOff = trendRows.length >= 4 && dropOffRatio < 0.8;
  const bestLaunchLabel = topTrend._id ? formatTrendLabel(topTrend._id) : null;
  const bestLaunchCount = topTrend.count || 0;
  const positiveShare = totalResponses > 0 ? Math.round((sentiment.positive / totalResponses) * 100) : 0;
  const negativeShare = totalResponses > 0 ? Math.round((sentiment.negative / totalResponses) * 100) : 0;

  const cards = [];

  if (totalResponses === 0) {
    cards.push({
      id: 'peak-engagement',
      tone: 'info',
      title: 'Peak engagement not available',
      body: 'No responses yet. Publish a form to start collecting signal and unlock live insights.',
      tag: 'Needs more data',
    });
  } else {
    cards.push({
      id: 'peak-engagement',
      tone: 'good',
      title: 'Peak engagement detected',
      body: bestLaunchLabel
        ? `Your strongest day was ${bestLaunchLabel} with ${bestLaunchCount} response${bestLaunchCount === 1 ? '' : 's'}.`
        : 'Response volume is live, but there is not enough trend data to isolate a peak day yet.',
      tag: 'Actionable signal',
    });
  }

  if (totalResponses === 0) {
    cards.push({
      id: 'drop-off-risk',
      tone: 'alert',
      title: 'Drop-off risk detected',
      body: 'Collect a few responses before we can measure where users stop dropping off.',
      tag: 'Monitoring paused',
    });
  } else if (hasDropOff) {
    cards.push({
      id: 'drop-off-risk',
      tone: 'alert',
      title: 'Drop-off risk detected',
      body: `Recent response volume is down about ${Math.round((1 - dropOffRatio) * 100)}% compared with the earlier half of the selected period.`,
      tag: 'Action needed',
    });
  } else {
    cards.push({
      id: 'drop-off-risk',
      tone: 'good',
      title: 'Drop-off risk not detected',
      body: 'Response volume is holding steady across the selected period.',
      tag: 'Healthy pattern',
    });
  }

  cards.push({
    id: 'best-launch-window',
    tone: totalResponses > 0 ? 'good' : 'info',
    title: totalResponses > 0 ? 'Best launch window' : 'Best launch window unavailable',
    body: totalResponses > 0
      ? bestLaunchLabel
        ? `Schedule the next push around ${bestLaunchLabel} to align with the highest observed response volume.`
        : 'Trend data is available, but the window is still too small to recommend a launch time.'
      : 'Once responses come in, we will highlight the strongest launch window automatically.',
    tag: totalResponses > 0 ? `${positiveShare}% positive · ${negativeShare}% negative` : 'Waiting on data',
  });

  if (validResponses + spamResponses > 0) {
    cards.push({
      id: 'integrity',
      tone: spamResponses > 0 ? 'alert' : 'good',
      title: spamResponses > 0 ? 'Integrity review required' : 'Forms are clean',
      body: spamResponses > 0
        ? `${spamResponses} submission${spamResponses === 1 ? '' : 's'} were marked as spam during the selected period.`
        : `All ${validResponses} tracked submission${validResponses === 1 ? '' : 's'} were marked valid.`,
      tag: 'Spam monitoring',
    });
  }

  return cards;
};

// ─── GET /api/analytics/overview ─────────────────────────
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30d', formId } = req.query;

    const days = getDaysForPeriod(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const responseFilter = { owner: userId, createdAt: { $gte: since } };
    if (formId && formId !== 'overall') {
      responseFilter.form = formId;
    }

    const [totalForms, publishedForms, draftForms, totalResponses, validResponses, spamResponses] =
      await Promise.all([
        Form.countDocuments({ owner: userId }),
        Form.countDocuments({ owner: userId, status: 'published' }),
        Form.countDocuments({ owner: userId, status: 'draft' }),
        Response.countDocuments(responseFilter),
        Response.countDocuments({ ...responseFilter, status: 'valid' }),
        Response.countDocuments({ ...responseFilter, status: 'spam' }),
      ]);

    const sentimentCounts = await Response.aggregate([
      { $match: responseFilter },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ]);

    const deviceCounts = await Response.aggregate([
      { $match: responseFilter },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]);

    const avgCompletionTime = await Response.aggregate([
      { $match: responseFilter },
      { $group: { _id: null, avg: { $avg: '$completionTime' } } },
    ]);

    const trendRows = await Response.aggregate([
      { $match: responseFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const sentimentMap = toCountMap(sentimentCounts);
    const deviceMap = toCountMap(deviceCounts);

    res.json({
      success: true,
      data: {
        forms: { total: totalForms, published: publishedForms, drafts: draftForms },
        responses: { total: totalResponses, valid: validResponses, spam: spamResponses },
        sentiment: sentimentMap,
        devices: deviceMap,
        avgCompletionTime: avgCompletionTime[0]?.avg || 0,
        avgPerForm: totalForms > 0 ? Math.round(totalResponses / totalForms) : 0,
        insights: buildInsights({
          totalResponses,
          validResponses,
          spamResponses,
          sentimentCounts: sentimentMap,
          trendRows,
        }),
        trendSummary: {
          totalPoints: trendRows.length,
          peakDay: trendRows.reduce((best, row) => (row.count > best.count ? row : best), trendRows[0] || { _id: null, count: 0 }),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/analytics/trends ────────────────────────────
exports.getTrends = async (req, res) => {
  try {
    const { period = '30d', formId } = req.query;
    const days = getDaysForPeriod(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const match = { owner: req.user._id, createdAt: { $gte: since } };
    if (formId && formId !== 'overall') match.form = formId;

    const trends = await Response.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, trends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
