#!/usr/bin/env node
/**
 * Generates src/lib/benchmarks/office-construction-costs.ts from RAW market data.
 * Run: node scripts/build-office-construction-costs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(
  __dirname,
  "../src/lib/benchmarks/office-construction-costs.ts"
);

/** [country, segment, positioning, delivery|null, buildingRate, parkingRate, basementRate, softCostsPercent, powcPercent, ffePercent, landRate, baseRentPsf, rentEscalation, openingOccupancy, stabilizedOccupancy, leaseUpYears, tiAllowancePsf, constructionLife, ffeLife, tiLife, leasingCommLife, ffeRenovationPctYear6, arMonths, apMonths] */
const RAW = [
  ["UAE", "prime_tower", "premium", null, 650, 350, 750, 12, 6, 2.5, 3000, 180, 4, 60, 95, 3, 150, 40, 7, 10, 6, 30, 2, 1],
  ["UAE", "prime_tower", "grade_a", null, 550, 300, 650, 11, 5.5, 3, 2500, 130, 3.5, 65, 92, 2, 100, 35, 7, 8, 5, 25, 1.5, 1],
  ["UAE", "prime_tower", "grade_b", null, 450, 250, 550, 10, 5, 3.5, 2000, 95, 3, 70, 88, 2, 70, 30, 6, 7, 5, 25, 1.5, 1],
  ["UAE", "prime_tower", "grade_c", null, 375, 200, 475, 9.5, 4.5, 4, 1500, 70, 2.5, 75, 85, 2, 50, 30, 6, 6, 4, 20, 1, 1],
  ["UAE", "business_park", "premium", null, 500, 275, 575, 11, 5.5, 4, 2000, 140, 3.5, 65, 93, 2, 110, 35, 7, 8, 5, 30, 1.5, 1],
  ["UAE", "business_park", "grade_a", null, 425, 230, 500, 10.5, 5, 4.5, 1600, 105, 3, 70, 90, 2, 80, 30, 6, 7, 5, 25, 1.5, 1],
  ["UAE", "business_park", "grade_b", null, 350, 190, 425, 10, 5, 5, 1200, 80, 3, 72, 88, 2, 60, 30, 6, 6, 4, 25, 1.5, 1],
  ["UAE", "business_park", "grade_c", null, 300, 160, 375, 9.5, 4.5, 5.5, 900, 60, 2.5, 75, 85, 1, 40, 25, 5, 5, 4, 20, 1, 1],
  ["UAE", "secondary", "premium", null, 425, 225, 500, 10.5, 5, 4, 1800, 115, 3, 70, 90, 2, 90, 30, 6, 7, 5, 25, 1.5, 1],
  ["UAE", "secondary", "grade_a", null, 375, 200, 450, 10, 5, 4.5, 1400, 90, 3, 72, 88, 2, 70, 30, 6, 6, 5, 25, 1.5, 1],
  ["UAE", "secondary", "grade_b", null, 325, 175, 400, 9.5, 4.5, 5, 1100, 70, 2.5, 75, 85, 1, 50, 25, 6, 6, 4, 20, 1, 1],
  ["UAE", "secondary", "grade_c", null, 275, 150, 350, 9, 4.5, 5.5, 800, 50, 2.5, 78, 82, 1, 35, 25, 5, 5, 4, 20, 1, 1],
  ["UAE", "co_working", "grade_a", "developer", 500, 300, 600, 11, 8, 15, 2500, 250, 3, 50, 85, 1, 50, 30, 4, 3, 2, 80, 1, 1],
  ["UAE", "co_working", "grade_a", "operator", 500, 300, 600, 11, 6, 2.5, 2500, 80, 3, 80, 90, 1, 20, 30, 7, 5, 5, 20, 1.5, 1],
  ["UAE", "co_working", "grade_b", "developer", 425, 250, 525, 10.5, 7.5, 12, 2000, 180, 3, 55, 82, 1, 40, 30, 4, 3, 2, 75, 1, 1],
  ["UAE", "co_working", "grade_b", "operator", 425, 250, 525, 10.5, 6, 2.5, 2000, 65, 2.5, 75, 88, 1, 15, 30, 6, 5, 4, 20, 1.5, 1],
  ["Saudi Arabia", "prime_tower", "premium", null, 550, 300, 650, 11.5, 5.5, 2.5, 2500, 150, 3.5, 60, 93, 3, 120, 40, 7, 10, 6, 30, 2, 1],
  ["Saudi Arabia", "prime_tower", "grade_a", null, 475, 260, 575, 11, 5.5, 3, 2000, 110, 3.5, 65, 90, 2, 90, 35, 7, 8, 5, 25, 1.5, 1],
  ["Saudi Arabia", "prime_tower", "grade_b", null, 400, 220, 500, 10, 5, 3.5, 1600, 80, 3, 70, 87, 2, 65, 30, 6, 7, 5, 25, 1.5, 1],
  ["Saudi Arabia", "prime_tower", "grade_c", null, 340, 185, 425, 9.5, 4.5, 4, 1200, 60, 2.5, 75, 84, 2, 45, 30, 6, 6, 4, 20, 1, 1],
  ["Saudi Arabia", "business_park", "premium", null, 440, 240, 520, 11, 5.5, 4, 1700, 120, 3.5, 65, 91, 2, 95, 35, 7, 8, 5, 30, 1.5, 1],
  ["Saudi Arabia", "business_park", "grade_a", null, 380, 205, 460, 10.5, 5, 4.5, 1350, 90, 3, 70, 89, 2, 75, 30, 6, 7, 5, 25, 1.5, 1],
  ["Saudi Arabia", "business_park", "grade_b", null, 320, 175, 400, 10, 5, 5, 1000, 70, 3, 72, 87, 2, 55, 30, 6, 6, 4, 25, 1.5, 1],
  ["Saudi Arabia", "business_park", "grade_c", null, 275, 150, 350, 9.5, 4.5, 5.5, 750, 52, 2.5, 75, 84, 1, 38, 25, 5, 5, 4, 20, 1, 1],
  ["Saudi Arabia", "secondary", "premium", null, 380, 205, 460, 10.5, 5, 4, 1500, 100, 3, 70, 89, 2, 80, 30, 6, 7, 5, 25, 1.5, 1],
  ["Saudi Arabia", "secondary", "grade_a", null, 340, 185, 420, 10, 5, 4.5, 1200, 80, 3, 72, 87, 2, 65, 30, 6, 6, 5, 25, 1.5, 1],
  ["Saudi Arabia", "secondary", "grade_b", null, 300, 165, 380, 9.5, 4.5, 5, 950, 62, 2.5, 75, 85, 1, 48, 25, 6, 6, 4, 20, 1, 1],
  ["Saudi Arabia", "secondary", "grade_c", null, 260, 140, 330, 9, 4.5, 5.5, 700, 45, 2.5, 78, 82, 1, 32, 25, 5, 5, 4, 20, 1, 1],
  ["Saudi Arabia", "co_working", "grade_a", "developer", 450, 275, 550, 11, 8, 14, 2000, 220, 3, 50, 84, 1, 45, 30, 4, 3, 2, 80, 1, 1],
  ["Saudi Arabia", "co_working", "grade_a", "operator", 450, 275, 550, 11, 6, 2.5, 2000, 70, 3, 80, 89, 1, 18, 30, 7, 5, 5, 20, 1.5, 1],
  ["Saudi Arabia", "co_working", "grade_b", "developer", 390, 230, 490, 10.5, 7.5, 12, 1700, 160, 3, 55, 81, 1, 38, 30, 4, 3, 2, 75, 1, 1],
  ["Saudi Arabia", "co_working", "grade_b", "operator", 390, 230, 490, 10.5, 6, 2.5, 1700, 58, 2.5, 75, 87, 1, 14, 30, 6, 5, 4, 20, 1.5, 1],
  ["Malaysia", "prime_tower", "premium", null, 450, 240, 550, 11, 5.5, 2.5, 1800, 120, 3, 62, 92, 3, 100, 35, 7, 10, 6, 30, 1.5, 1],
  ["Malaysia", "prime_tower", "grade_a", null, 380, 205, 480, 10.5, 5, 3, 1400, 88, 3, 68, 90, 2, 75, 30, 7, 8, 5, 25, 1.5, 1],
  ["Malaysia", "prime_tower", "grade_b", null, 320, 175, 420, 10, 5, 3.5, 1100, 65, 2.5, 72, 87, 2, 55, 30, 6, 7, 5, 25, 1, 1],
  ["Malaysia", "prime_tower", "grade_c", null, 275, 150, 360, 9.5, 4.5, 4, 850, 48, 2.5, 76, 84, 2, 40, 25, 6, 6, 4, 20, 1, 1],
  ["Malaysia", "business_park", "premium", null, 360, 195, 450, 10.5, 5, 4, 1300, 95, 3, 68, 91, 2, 80, 30, 7, 8, 5, 30, 1.5, 1],
  ["Malaysia", "business_park", "grade_a", null, 310, 170, 400, 10, 5, 4.5, 1050, 72, 2.5, 72, 89, 2, 62, 30, 6, 7, 5, 25, 1.5, 1],
  ["Malaysia", "business_park", "grade_b", null, 265, 145, 350, 9.5, 4.5, 5, 800, 55, 2.5, 74, 87, 2, 48, 25, 6, 6, 4, 25, 1, 1],
  ["Malaysia", "business_park", "grade_c", null, 230, 125, 310, 9, 4.5, 5.5, 600, 42, 2.5, 77, 84, 1, 32, 25, 5, 5, 4, 20, 1, 1],
  ["Malaysia", "secondary", "premium", null, 310, 170, 400, 10, 5, 4, 1150, 80, 2.5, 72, 89, 2, 68, 30, 6, 7, 5, 25, 1.5, 1],
  ["Malaysia", "secondary", "grade_a", null, 275, 150, 360, 9.5, 4.5, 4.5, 900, 62, 2.5, 74, 87, 2, 52, 25, 6, 6, 5, 25, 1, 1],
  ["Malaysia", "secondary", "grade_b", null, 240, 130, 320, 9, 4.5, 5, 700, 48, 2.5, 76, 85, 1, 40, 25, 6, 6, 4, 20, 1, 1],
  ["Malaysia", "secondary", "grade_c", null, 210, 115, 285, 9, 4, 5.5, 550, 36, 2, 78, 82, 1, 28, 25, 5, 5, 4, 20, 1, 1],
  ["Malaysia", "co_working", "grade_a", "developer", 360, 220, 480, 10.5, 7.5, 13, 1400, 180, 2.5, 52, 83, 1, 38, 30, 4, 3, 2, 75, 1, 1],
  ["Malaysia", "co_working", "grade_a", "operator", 360, 220, 480, 10.5, 5.5, 2.5, 1400, 58, 2.5, 78, 88, 1, 15, 30, 7, 5, 5, 20, 1.5, 1],
  ["Malaysia", "co_working", "grade_b", "developer", 310, 190, 430, 10, 7, 11, 1150, 130, 2.5, 56, 80, 1, 32, 30, 4, 3, 2, 70, 1, 1],
  ["Malaysia", "co_working", "grade_b", "operator", 310, 190, 430, 10, 5.5, 2.5, 1150, 48, 2.5, 74, 86, 1, 12, 30, 6, 5, 4, 20, 1, 1],
  ["Australia", "prime_tower", "premium", null, 4200, 2300, 4800, 12.5, 6.5, 2.5, 18000, 950, 3, 62, 94, 3, 750, 45, 8, 10, 6, 30, 2, 1.2],
  ["Australia", "prime_tower", "grade_a", null, 3600, 2000, 4200, 12, 6, 3, 14500, 720, 2.5, 68, 92, 2, 550, 40, 8, 8, 5, 25, 1.5, 1],
  ["Australia", "prime_tower", "grade_b", null, 3100, 1750, 3700, 11.5, 5.5, 3.5, 11500, 550, 2.5, 72, 90, 2, 420, 35, 7, 7, 5, 25, 1.5, 1],
  ["Australia", "prime_tower", "grade_c", null, 2650, 1500, 3200, 11, 5, 4, 9000, 420, 2.5, 76, 87, 2, 320, 35, 7, 6, 4, 20, 1.2, 1],
  ["Australia", "business_park", "premium", null, 3400, 1900, 4000, 12, 6, 4, 12500, 750, 2.5, 68, 92, 2, 600, 40, 8, 8, 5, 30, 1.5, 1],
  ["Australia", "business_park", "grade_a", null, 2950, 1650, 3500, 11.5, 5.5, 4.5, 10000, 580, 2.5, 72, 90, 2, 470, 35, 7, 7, 5, 25, 1.5, 1],
  ["Australia", "business_park", "grade_b", null, 2550, 1450, 3100, 11, 5.5, 5, 8000, 450, 2.5, 74, 88, 2, 360, 35, 7, 6, 4, 25, 1.2, 1],
  ["Australia", "business_park", "grade_c", null, 2200, 1250, 2700, 10.5, 5, 5.5, 6200, 350, 2.5, 77, 86, 1, 270, 30, 6, 6, 4, 20, 1.2, 1],
  ["Australia", "secondary", "premium", null, 2950, 1650, 3500, 11.5, 5.5, 4, 10500, 620, 2.5, 72, 90, 2, 500, 35, 7, 7, 5, 25, 1.5, 1],
  ["Australia", "secondary", "grade_a", null, 2600, 1450, 3150, 11, 5.5, 4.5, 8500, 490, 2.5, 74, 88, 2, 400, 35, 7, 6, 5, 25, 1.2, 1],
  ["Australia", "secondary", "grade_b", null, 2300, 1300, 2800, 10.5, 5, 5, 6800, 380, 2.5, 76, 86, 1, 310, 30, 7, 6, 4, 20, 1.2, 1],
  ["Australia", "secondary", "grade_c", null, 2000, 1150, 2450, 10.5, 5, 5.5, 5400, 300, 2.5, 78, 84, 1, 240, 30, 6, 5, 4, 20, 1, 1],
  ["Australia", "co_working", "grade_a", "developer", 3400, 2000, 4000, 12, 8.5, 16, 14500, 1350, 2.5, 52, 84, 1, 280, 35, 4, 3, 2, 85, 1, 1],
  ["Australia", "co_working", "grade_a", "operator", 3400, 2000, 4000, 12, 6, 2.5, 14500, 420, 2.5, 80, 89, 1, 100, 35, 8, 5, 5, 20, 1.5, 1],
  ["Australia", "co_working", "grade_b", "developer", 2950, 1750, 3500, 11.5, 8, 13, 12000, 980, 2.5, 56, 81, 1, 220, 35, 4, 3, 2, 80, 1, 1],
  ["Australia", "co_working", "grade_b", "operator", 2950, 1750, 3500, 11.5, 6, 2.5, 12000, 340, 2.5, 76, 87, 1, 80, 35, 7, 5, 4, 20, 1.2, 1],
  ["Vietnam", "prime_tower", "premium", null, 420, 225, 520, 11, 5.5, 2.5, 2200, 110, 3.5, 60, 91, 3, 90, 35, 7, 10, 6, 30, 1.5, 1],
  ["Vietnam", "prime_tower", "grade_a", null, 360, 195, 460, 10.5, 5, 3, 1750, 82, 3.5, 66, 89, 2, 70, 30, 7, 8, 5, 25, 1.5, 1],
  ["Vietnam", "prime_tower", "grade_b", null, 310, 170, 410, 10, 5, 3.5, 1350, 62, 3, 70, 86, 2, 52, 30, 6, 7, 5, 25, 1, 1],
  ["Vietnam", "prime_tower", "grade_c", null, 265, 145, 350, 9.5, 4.5, 4, 1050, 46, 3, 74, 83, 2, 38, 25, 6, 6, 4, 20, 1, 1],
  ["Vietnam", "business_park", "premium", null, 340, 185, 430, 10.5, 5, 4, 1550, 88, 3.5, 66, 90, 2, 72, 30, 7, 8, 5, 30, 1.5, 1],
  ["Vietnam", "business_park", "grade_a", null, 295, 160, 380, 10, 5, 4.5, 1250, 68, 3, 70, 88, 2, 56, 30, 6, 7, 5, 25, 1, 1],
  ["Vietnam", "business_park", "grade_b", null, 255, 140, 340, 9.5, 4.5, 5, 950, 52, 3, 72, 86, 2, 44, 25, 6, 6, 4, 25, 1, 1],
  ["Vietnam", "business_park", "grade_c", null, 220, 120, 300, 9, 4.5, 5.5, 720, 40, 2.5, 75, 83, 1, 30, 25, 5, 5, 4, 20, 1, 1],
  ["Vietnam", "secondary", "premium", null, 295, 160, 380, 10, 5, 4, 1350, 75, 3, 70, 88, 2, 62, 30, 6, 7, 5, 25, 1, 1],
  ["Vietnam", "secondary", "grade_a", null, 260, 140, 340, 9.5, 4.5, 4.5, 1050, 58, 3, 72, 86, 2, 48, 25, 6, 6, 5, 25, 1, 1],
  ["Vietnam", "secondary", "grade_b", null, 230, 125, 305, 9, 4.5, 5, 820, 45, 2.5, 74, 84, 1, 36, 25, 6, 6, 4, 20, 1, 1],
  ["Vietnam", "secondary", "grade_c", null, 200, 110, 270, 9, 4, 5.5, 640, 34, 2.5, 76, 81, 1, 26, 25, 5, 5, 4, 20, 1, 1],
  ["Vietnam", "co_working", "grade_a", "developer", 340, 210, 460, 10.5, 7.5, 13, 1750, 165, 3, 52, 82, 1, 35, 30, 4, 3, 2, 75, 1, 1],
  ["Vietnam", "co_working", "grade_a", "operator", 340, 210, 460, 10.5, 5.5, 2.5, 1750, 54, 3, 78, 87, 1, 14, 30, 7, 5, 5, 20, 1.5, 1],
  ["Vietnam", "co_working", "grade_b", "developer", 295, 180, 410, 10, 7, 11, 1450, 120, 3, 56, 80, 1, 28, 30, 4, 3, 2, 70, 1, 1],
  ["Vietnam", "co_working", "grade_b", "operator", 295, 180, 410, 10, 5.5, 2.5, 1450, 44, 3, 74, 85, 1, 11, 30, 6, 5, 4, 20, 1, 1],
  ["Thailand", "prime_tower", "premium", null, 520, 280, 620, 11, 5.5, 2.5, 2600, 135, 3, 62, 92, 3, 105, 35, 7, 10, 6, 30, 1.5, 1],
  ["Thailand", "prime_tower", "grade_a", null, 445, 240, 550, 10.5, 5, 3, 2100, 100, 3, 68, 90, 2, 80, 30, 7, 8, 5, 25, 1.5, 1],
  ["Thailand", "prime_tower", "grade_b", null, 380, 205, 480, 10, 5, 3.5, 1600, 75, 2.5, 72, 87, 2, 60, 30, 6, 7, 5, 25, 1, 1],
  ["Thailand", "prime_tower", "grade_c", null, 325, 175, 410, 9.5, 4.5, 4, 1250, 56, 2.5, 76, 84, 2, 44, 30, 6, 6, 4, 20, 1, 1],
  ["Thailand", "business_park", "premium", null, 420, 230, 520, 10.5, 5, 4, 1850, 108, 3, 68, 91, 2, 85, 30, 7, 8, 5, 30, 1.5, 1],
  ["Thailand", "business_park", "grade_a", null, 365, 200, 460, 10, 5, 4.5, 1500, 82, 2.5, 72, 89, 2, 66, 30, 6, 7, 5, 25, 1, 1],
  ["Thailand", "business_park", "grade_b", null, 315, 175, 405, 9.5, 4.5, 5, 1150, 64, 2.5, 74, 87, 2, 52, 25, 6, 6, 4, 25, 1, 1],
  ["Thailand", "business_park", "grade_c", null, 270, 150, 350, 9, 4.5, 5.5, 880, 49, 2.5, 77, 84, 1, 36, 25, 5, 5, 4, 20, 1, 1],
  ["Thailand", "secondary", "premium", null, 365, 200, 460, 10, 5, 4, 1600, 92, 2.5, 72, 89, 2, 74, 30, 6, 7, 5, 25, 1, 1],
  ["Thailand", "secondary", "grade_a", null, 325, 175, 410, 9.5, 4.5, 4.5, 1250, 72, 2.5, 74, 87, 2, 58, 30, 6, 6, 5, 25, 1, 1],
  ["Thailand", "secondary", "grade_b", null, 285, 155, 365, 9, 4.5, 5, 980, 56, 2.5, 76, 85, 1, 44, 25, 6, 6, 4, 20, 1, 1],
  ["Thailand", "secondary", "grade_c", null, 250, 135, 320, 9, 4, 5.5, 760, 42, 2.5, 78, 82, 1, 32, 25, 5, 5, 4, 20, 1, 1],
  ["Thailand", "co_working", "grade_a", "developer", 420, 260, 550, 10.5, 7.5, 14, 2100, 200, 2.5, 52, 83, 1, 42, 30, 4, 3, 2, 80, 1, 1],
  ["Thailand", "co_working", "grade_a", "operator", 420, 260, 550, 10.5, 5.5, 2.5, 2100, 66, 2.5, 78, 88, 1, 16, 30, 7, 5, 5, 20, 1.5, 1],
  ["Thailand", "co_working", "grade_b", "developer", 365, 225, 485, 10, 7, 12, 1750, 145, 2.5, 56, 81, 1, 34, 30, 4, 3, 2, 75, 1, 1],
  ["Thailand", "co_working", "grade_b", "operator", 365, 225, 485, 10, 5.5, 2.5, 1750, 54, 2.5, 74, 86, 1, 13, 30, 6, 5, 4, 20, 1, 1],
];

function rowToBenchmark(r) {
  const [
    country,
    segment,
    positioning,
    delivery,
    buildingRate,
    parkingRate,
    basementRate,
    softCostsPercent,
    powcPercent,
    ffePercent,
    landRate,
    baseRentPsf,
    rentEscalation,
    openingOccupancy,
    stabilizedOccupancy,
    leaseUpYears,
    tiAllowancePsf,
    constructionLife,
    ffeLife,
    tiLife,
    leasingCommLife,
    ffeRenovationPctYear6,
    arMonths,
    apMonths,
  ] = r;
  const b = {
    country,
    segment,
    positioning,
    buildingRate,
    parkingRate,
    basementRate,
    softCostsPercent,
    powcPercent,
    ffePercent,
    landRate,
    baseRentPsf,
    rentEscalation,
    openingOccupancy,
    stabilizedOccupancy,
    leaseUpYears,
    tiAllowancePsf,
    constructionLife,
    ffeLife,
    tiLife,
    leasingCommLife,
    ffeRenovationPctYear6,
    arMonths,
    apMonths,
  };
  if (delivery) b.coworkingDelivery = delivery;
  return b;
}

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}

function formatBenchmark(b, indent = "  ") {
  const lines = [
    `${indent}{`,
    `${indent}  country: ${JSON.stringify(b.country)},`,
    `${indent}  segment: ${JSON.stringify(b.segment)},`,
    `${indent}  positioning: ${JSON.stringify(b.positioning)},`,
  ];
  if (b.coworkingDelivery) {
    lines.push(
      `${indent}  coworkingDelivery: ${JSON.stringify(b.coworkingDelivery)},`
    );
  }
  const fields = [
    "buildingRate",
    "parkingRate",
    "basementRate",
    "softCostsPercent",
    "powcPercent",
    "ffePercent",
    "landRate",
    "baseRentPsf",
    "rentEscalation",
    "openingOccupancy",
    "stabilizedOccupancy",
    "leaseUpYears",
    "tiAllowancePsf",
    "constructionLife",
    "ffeLife",
    "tiLife",
    "leasingCommLife",
    "ffeRenovationPctYear6",
    "arMonths",
    "apMonths",
  ];
  for (const f of fields) {
    lines.push(`${indent}  ${f}: ${fmtNum(b[f])},`);
  }
  lines.push(`${indent}},`);
  return lines.join("\n");
}

const benchmarks = RAW.map(rowToBenchmark);

const ts = `// AUTO-GENERATED by scripts/build-office-construction-costs.mjs — do not edit by hand.

export type OfficeSegment =
  | "prime_tower"
  | "business_park"
  | "secondary"
  | "co_working";

export type OfficePositioning =
  | "premium"
  | "grade_a"
  | "grade_b"
  | "grade_c";

export type OfficeCoworkingDelivery = "developer" | "operator";

export interface OfficeConstructionBenchmark {
  country: string;
  segment: string;
  positioning: string;
  coworkingDelivery?: OfficeCoworkingDelivery;

  buildingRate: number;
  parkingRate: number;
  basementRate: number;

  softCostsPercent: number;
  powcPercent: number;
  ffePercent: number;

  landRate: number;

  baseRentPsf: number;
  rentEscalation: number;
  openingOccupancy: number;
  stabilizedOccupancy: number;
  leaseUpYears: number;
  tiAllowancePsf: number;

  constructionLife: number;
  ffeLife: number;
  tiLife: number;
  leasingCommLife: number;
  ffeRenovationPctYear6: number;

  arMonths: number;
  apMonths: number;
}

export function normalizeOfficeCountry(country: string): string {
  const c = (country || "").trim();
  if (c === "United Arab Emirates" || c === "UAE") return "UAE";
  if (c === "Saudi Arabia" || c === "KSA") return "Saudi Arabia";
  return c;
}

export const OFFICE_CONSTRUCTION_BENCHMARKS: OfficeConstructionBenchmark[] = [
${benchmarks.map((b) => formatBenchmark(b)).join("\n")}
];

export const DEFAULT_OFFICE_CONSTRUCTION_BENCHMARK: OfficeConstructionBenchmark =
  OFFICE_CONSTRUCTION_BENCHMARKS.find(
    (b) =>
      b.country === "UAE" &&
      b.segment === "prime_tower" &&
      b.positioning === "grade_a" &&
      !b.coworkingDelivery
  )!;

export function getOfficeBenchmarkProfileKey(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: string
): string {
  const c = normalizeOfficeCountry(country);
  return [c, segment, positioning, coworkingDelivery || "n/a"].join(":");
}

export function getOfficeBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: string
): OfficeConstructionBenchmark | null {
  const c = normalizeOfficeCountry(country);
  const pool = OFFICE_CONSTRUCTION_BENCHMARKS.filter(
    (b) =>
      b.country === c &&
      b.segment === segment &&
      b.positioning === positioning
  );
  if (!pool.length) return null;

  if (segment === "co_working" && coworkingDelivery) {
    return (
      pool.find((b) => b.coworkingDelivery === coworkingDelivery) ?? pool[0]
    );
  }

  return pool.find((b) => !b.coworkingDelivery) ?? pool[0];
}

export function resolveOfficeBenchmark(
  country: string,
  segment: string,
  positioning: string,
  coworkingDelivery?: string
): OfficeConstructionBenchmark {
  const exact = getOfficeBenchmark(
    country,
    segment,
    positioning,
    coworkingDelivery
  );
  if (exact) return exact;

  const c = normalizeOfficeCountry(country);
  const sameSegment = OFFICE_CONSTRUCTION_BENCHMARKS.filter(
    (b) => b.country === c && b.segment === segment
  );
  if (sameSegment.length) {
    return (
      sameSegment.find(
        (b) =>
          b.positioning === positioning &&
          (!coworkingDelivery || b.coworkingDelivery === coworkingDelivery)
      ) ??
      sameSegment.find((b) => b.positioning === "grade_a") ??
      sameSegment[0]!
    );
  }

  const sameCountry = OFFICE_CONSTRUCTION_BENCHMARKS.filter(
    (b) => b.country === c
  );
  if (sameCountry.length) {
    return (
      sameCountry.find((b) => b.positioning === positioning) ??
      sameCountry.find((b) => b.positioning === "grade_a") ??
      sameCountry[0]!
    );
  }

  return {
    ...DEFAULT_OFFICE_CONSTRUCTION_BENCHMARK,
    country: c,
    segment,
    positioning,
  };
}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, ts);
console.log(`Generated ${benchmarks.length} benchmarks -> ${OUT}`);
