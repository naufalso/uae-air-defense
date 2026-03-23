const CSV_FILES = import.meta.glob('../../data/*.csv', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const CHART_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

export function getLatestLocalCsv() {
  const entries = Object.entries(CSV_FILES);
  if (entries.length === 0) {
    return null;
  }

  const impactEntries = entries.filter(([path]) => path.endsWith('_impact.csv'));
  const candidateEntries = impactEntries.length > 0 ? impactEntries : entries;
  const [path, content] = candidateEntries.sort(([a], [b]) => a.localeCompare(b)).at(-1);

  return {
    fileName: path.split('/').pop() || 'Local dataset',
    content,
  };
}

export function parseDateValue(value) {
  if (!value) {
    return Number.NaN;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const euMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function formatChartDate(value) {
  const timestamp = parseDateValue(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  return CHART_DATE_FORMATTER.format(new Date(timestamp));
}

export function parseCSV(content) {
  if (!content) {
    return [];
  }

  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      const nextChar = content[index + 1];
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[index + 1] === '\n') {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .map((cells) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = (cells[index] || '').trim();
      });
      return record;
    })
    .filter((record) => record.Date);
}

function parseNumber(value) {
  if (value === undefined || value === null) {
    return 0;
  }
  const cleaned = String(value).replace(/[,"]/g, '').trim();
  return Number.parseInt(cleaned, 10) || 0;
}

export function formatData(parsedData) {
  const grouped = {};

  parsedData.forEach((row) => {
    if (!row.Date) {
      return;
    }

    const date = row.Date;
    const likes = parseNumber(row.Likes);
    const ballisticDetected = parseNumber(row.ballistic_detected);
    const ballisticIntercepted = parseNumber(row.ballistic_intercepted);
    const ballisticSea = parseNumber(row.ballistic_sea);
    const ballisticLand = parseNumber(row.ballistic_land);
    const uavDetected = parseNumber(row.UAV_detected);
    const uavIntercepted = parseNumber(row.UAV_intercepted);
    const uavSea = parseNumber(row.UAV_sea);
    const uavLand = parseNumber(row.UAV_land);

    if (!grouped[date]) {
      grouped[date] = {
        ...row,
        Likes: likes,
        ballistic_detected: ballisticDetected,
        ballistic_intercepted: ballisticIntercepted,
        ballistic_sea: ballisticSea,
        ballistic_land: ballisticLand,
        ballistic_neutralized: ballisticIntercepted + ballisticSea,
        UAV_detected: uavDetected,
        UAV_intercepted: uavIntercepted,
        UAV_sea: uavSea,
        UAV_land: uavLand,
        UAV_neutralized: uavIntercepted + uavSea,
      };
      return;
    }

    grouped[date].Likes += likes;
    grouped[date].ballistic_detected = Math.max(grouped[date].ballistic_detected, ballisticDetected);
    grouped[date].ballistic_intercepted = Math.max(grouped[date].ballistic_intercepted, ballisticIntercepted);
    grouped[date].ballistic_sea = Math.max(grouped[date].ballistic_sea || 0, ballisticSea);
    grouped[date].ballistic_land = Math.max(grouped[date].ballistic_land || 0, ballisticLand);
    grouped[date].ballistic_neutralized = grouped[date].ballistic_intercepted + grouped[date].ballistic_sea;

    grouped[date].UAV_detected = Math.max(grouped[date].UAV_detected, uavDetected);
    grouped[date].UAV_intercepted = Math.max(grouped[date].UAV_intercepted, uavIntercepted);
    grouped[date].UAV_sea = Math.max(grouped[date].UAV_sea || 0, uavSea);
    grouped[date].UAV_land = Math.max(grouped[date].UAV_land || 0, uavLand);
    grouped[date].UAV_neutralized = grouped[date].UAV_intercepted + grouped[date].UAV_sea;

    if (grouped[date].Title !== row.Title && row.Title) {
      grouped[date].Title += ` | ${row.Title}`;
    }
  });

  return Object.values(grouped).sort((a, b) => parseDateValue(b.Date) - parseDateValue(a.Date));
}

export function toTimelineData(data) {
  return [...data]
    .sort((a, b) => parseDateValue(a.Date) - parseDateValue(b.Date))
    .map((day) => ({
      ...day,
      dateLabel: formatChartDate(day.Date),
    }));
}
