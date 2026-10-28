export default function validateSpace({ number, pricePerHour, capacity, floor }) {
  if (!String(number ?? '').trim()) return 'Введите номер места';

  const price = Number(pricePerHour);
  if (!Number.isInteger(price) || price < 1) {
    return 'Цена за час — целое число больше 0';
  }

  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 20) {
    return 'Вместимость — целое число от 1 до 20';
  }

  const fl = Number(floor);
  if (!Number.isInteger(fl) || fl < 1 || fl > 50) {
    return 'Этаж — целое число от 1 до 50';
  }

  return null;
}