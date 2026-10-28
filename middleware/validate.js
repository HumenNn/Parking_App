function isNonEmptyString(value, min, max) {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return t.length >= min && t.length <= max;
}

function parsePrice(raw) {
  if (raw === undefined || raw === null) return { ok: false, error: 'Укажите цену' };
  const s = String(raw).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return { ok: false, error: 'Цена: число, не больше 2 знаков после запятой' };
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: 'Некорректная цена' };
  if (n < 0) return { ok: false, error: 'Цена не может быть отрицательной' };
  if (n > 100) return { ok: false, error: 'Цена не больше 100 BYN/час' };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

function parseSpaceNumber(raw) {
  if (!isNonEmptyString(String(raw || ''), 1, 20)) {
    return { ok: false, error: 'Номер места: от 1 до 20 символов' };
  }
  const t = String(raw).trim();
  if (!/^[A-Za-zА-Яа-яЁё0-9\-]+$/.test(t)) {
    return { ok: false, error: 'Номер: только буквы, цифры и дефис' };
  }
  return { ok: true, value: t };
}

function parseLocation(raw) {
  const t = String(raw || '').trim();
  if (t.length === 0) return { ok: true, value: 'Не указано' };
  if (t.length > 100) return { ok: false, error: 'Расположение: максимум 100 символов' };
  return { ok: true, value: t };
}

function parseEmail(raw) {
  const t = String(raw || '').trim().toLowerCase();
  if (t.length < 5 || t.length > 100) {
    return { ok: false, error: 'Email: от 5 до 100 символов' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return { ok: false, error: 'Некорректный email' };
  }
  return { ok: true, value: t };
}

function parsePassword(raw) {
  const t = String(raw || '');
  if (t.length < 6 || t.length > 64) {
    return { ok: false, error: 'Пароль: от 6 до 64 символов' };
  }
  if (/\s/.test(t)) {
    return { ok: false, error: 'Пароль не должен содержать пробелы' };
  }
  return { ok: true, value: t };
}

function parseId(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) {
    return { ok: false, error: 'Некорректный идентификатор' };
  }
  return { ok: true, value: n };
}

module.exports = {
  parsePrice,
  parseSpaceNumber,
  parseLocation,
  parseEmail,
  parsePassword,
  parseId
};