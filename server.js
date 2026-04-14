const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx-js-style");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json());

const DATA_FILE = "data.json";

// 초기 데이터 로드
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};

    const raw = fs.readFileSync(DATA_FILE, "utf-8");

    if (!raw.trim()) return {};

    return JSON.parse(raw);

  } catch (err) {
    console.error("데이터 로드 오류:", err);
    return {};
  }
}

// 저장
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("저장 오류:", err);
  }
}

// 문자열 정규화
function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s*\d+\s*$/, "")  // 끝 숫자 제거
    .replace(/\s+/g, " ");      // 공백 정리
}
// 숫자 추출 (뒤 최대 2개)
function extractQuantity(str) {
  const match = str.match(/(\d{1,2})$/);
  return match ? parseInt(match[1]) : 1;
}

// 유사도 계산 (간단한 Jaccard)
function similarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

// 노란색 셀 감지
function isYellow(cell) {
  if (!cell || !cell.s || !cell.s.fill || !cell.s.fill.fgColor) {
    return false;
  }
  return true;
}

// 엑셀 파싱
function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  let result = {};

  const CATEGORY_LIST = [
    "디지털 / 주방잡화",
    "스포츠/공구/자동차",
    "음료 / 생필",
    "이미용 / 건강",
    "가공",
    "스낵",
    "견과",
    "잡곡",
    "신선 / 베이커리",
    "해산물",
    "정육 / 치즈",
    "김치",
    "냉장 / 냉동",
    "소스 / 오일",
    "가루/분말"
  ];

  function isCategory(text) {
    return CATEGORY_LIST.includes(text.trim());
  }

  // 🔥 핵심: "열 기준"으로 탐색
  for (let C = range.s.c; C <= range.e.c; C++) {

    let currentCategory = null;

    for (let R = range.s.r; R <= range.e.r; R++) {

      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || !cell.v) continue;

      const value = String(cell.v).trim();

      // ✅ 카테고리 발견
      if (isCategory(value)) {
        currentCategory = value;

        if (!result[currentCategory]) {
          result[currentCategory] = [];
        }

        continue;
      }

      // ✅ 같은 열에서만 데이터 쌓기
      if (currentCategory) {
        result[currentCategory].push(value);
      }
    }
  }

  return result;
}

// 업로드 처리
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    console.log("==== 업로드 시작 ====");
    console.log("파일:", req.files);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "파일 없음" });
    }

    console.log("엑셀 파싱 시작");

    const db = loadData();

let added = 0;
let duplicates = 0;

for (let file of req.files) {

  const parsed = parseExcel(file.path);

  if (!parsed || typeof parsed !== "object") continue;

  console.log("파싱 결과:", parsed);

  for (let category in parsed) {
    if (!db[category]) db[category] = [];

    parsed[category].forEach(item => {

      const name = normalize(item);
      const qty = extractQuantity(item);

      let foundIndex = db[category].findIndex(existing => {
        const normExisting = normalize(existing.name || existing);
        return (
          name === normExisting ||
          similarity(name, normExisting) >= 0.8
        );
      });

      if (foundIndex !== -1) {
        if (typeof db[category][foundIndex] === "object") {
          db[category][foundIndex].quantity += qty;
        } else {
          db[category][foundIndex] = {
            name: normalize(db[category][foundIndex]),
            quantity: 1 + qty
          };
        }

        duplicates++;

      } else {
        db[category].push({
          name,
          quantity: qty
        });

        added++;
      }

    });
  }

  fs.unlinkSync(file.path);
}

    saveData(db);

    console.log("==== 완료 ====");

    return res.json({ added, duplicates });

} catch (err) {
    console.error("🔥🔥🔥 진짜 에러:", err.message);
    console.error(err.stack);

    return res.status(500).send(err.message); // JSON 말고 문자열로 강제 출력
  }
});

//당일용

app.post("/today", upload.array("files"), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "파일 없음" });
    }

    let result = {};

    for (let file of req.files) {
      const parsed = parseExcel(file.path);

      if (!parsed || typeof parsed !== "object") continue;

      for (let category in parsed) {
        if (!result[category]) result[category] = [];

        parsed[category].forEach(item => {
          const name = normalize(item);
          const qty = extractQuantity(item);

          result[category].push({
            name,
            quantity: qty
          });
        });
      }

      fs.unlinkSync(file.path);
    }

    res.json(result);

  } catch (err) {
    console.error("today 에러:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 초기화

app.post("/reset", (req, res) => {
  try {
    saveData({}); // 데이터 비우기
    res.json({ message: "데이터 초기화 완료" });
  } catch (err) {
    console.error("초기화 에러:", err);
    res.status(500).json({ error: "초기화 실패" });
  }
});





// 🔥 진짜 데이터 조회 API
app.get("/data", (req, res) => {
  res.json(loadData());
});

// 데이터 조회
app.get("/export", (req, res) => {
  try {
    const data = loadData();
    const includeQuantity = req.query.quantity === "1" || req.query.quantity === "true";

    const wb = XLSX.utils.book_new();

    const categories = Object.keys(data);
    let maxLength = 0;

    categories.forEach(cat => {
      if (data[cat].length > maxLength) {
        maxLength = data[cat].length;
      }
    });

    const sheetData = [];
    const headers = includeQuantity
      ? categories.flatMap(cat => [cat, `${cat} 수량`])
      : categories;
    sheetData.push(headers);

    for (let i = 0; i < maxLength; i++) {
      const row = [];
      categories.forEach(cat => {
        const cellValue = data[cat][i] || "";

        if (includeQuantity) {
          if (cellValue && typeof cellValue === "object") {
            row.push(cellValue.name || "");
            row.push(cellValue.quantity || "");
          } else {
            row.push(cellValue);
            row.push("");
          }
        } else {
          if (cellValue && typeof cellValue === "object") {
            row.push(cellValue.name || "");
          } else {
            row.push(cellValue);
          }
        }
      });
      sheetData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 🔥 스타일 적용
    const range = XLSX.utils.decode_range(ws["!ref"]);

    for (let C = range.s.c; C <= range.e.c; C++) {
      for (let R = range.s.r; R <= range.e.r; R++) {

        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        // 🔥 카테고리 (첫 행)
        if (R === 0) {
          cell.s = {
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            fill: {
              patternType: "solid",
              fgColor: { rgb: "FFFF00" }
            },
            border: {
              top: { style: "thick" },
              bottom: { style: "thick" },
              left: { style: "thick" },
              right: { style: "thick" }
            }
          };
        } else {
          // 🔥 데이터 셀
          cell.s = {
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      }
    }

    // 🔥 열 너비 자동 조절
    const colCount = sheetData[0].length;
    const colWidths = Array.from({ length: colCount }, (_, colIndex) => {
      let maxLen = 10;

      sheetData.forEach(row => {
        const val = row[colIndex];
        if (val) {
          const str = val.toString();

          // 🔥 한글 고려 (2배 처리)
          const length = str.split("").reduce((acc, ch) => {
            return acc + (ch.charCodeAt(0) > 255 ? 2 : 1);
          }, 0);

          maxLen = Math.max(maxLen, length);
        }
      });

      return { wch: maxLen + 5 }; // 🔥 여유 더 줌
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Data");

    const filePath = "export.xlsx";
    XLSX.writeFile(wb, filePath);

    res.download(filePath, "export.xlsx", (err) => {
      if (err) console.error(err);
      saveData({});
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`서버 실행: ${PORT}`);
});