"use strict";

const SPACES = [
  { number: "A3", isAvailable: true, pricePerHour: 5, location: "Первый этаж", capacity: 1 },
  { number: "A4", isAvailable: true, pricePerHour: 5, location: "Первый этаж", capacity: 1 },
  { number: "A5", isAvailable: false, pricePerHour: 5, location: "Первый этаж", capacity: 2 },
  { number: "A6", isAvailable: true, pricePerHour: 6, location: "Первый этаж", capacity: 1 },
  { number: "B2", isAvailable: true, pricePerHour: 7, location: "Второй этаж", capacity: 1 },
  { number: "B3", isAvailable: false, pricePerHour: 7, location: "Второй этаж", capacity: 1 },
  { number: "B4", isAvailable: true, pricePerHour: 7, location: "Второй этаж", capacity: 2 },
  { number: "B5", isAvailable: true, pricePerHour: 8, location: "Второй этаж", capacity: 1 },
  { number: "C1", isAvailable: true, pricePerHour: 10, location: "Крытая зона", capacity: 1 },
  { number: "C2", isAvailable: false, pricePerHour: 10, location: "Крытая зона", capacity: 1 },
  { number: "C3", isAvailable: true, pricePerHour: 10, location: "Крытая зона", capacity: 3 },
  { number: "C4", isAvailable: true, pricePerHour: 12, location: "Крытая зона", capacity: 1 },
  { number: "D1", isAvailable: true, pricePerHour: 3, location: "Открытая площадка", capacity: 1 },
  { number: "D2", isAvailable: true, pricePerHour: 3, location: "Открытая площадка", capacity: 1 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "ParkingSpaces",
      SPACES.map((s) => ({ ...s, createdAt: now, updatedAt: now })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "ParkingSpaces",
      { number: SPACES.map((s) => s.number) },
      {},
    );
  },
};
