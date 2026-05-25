const pdfParse = require('pdf-parse');
const fs = require('fs');

async function testPdfParse() {
  const pdfPath = 'C:/Users/34252/Desktop/2027年方法实战班.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const result = await pdfParse(buffer);

  console.log('Total pages:', result.numpages);
  console.log('Total length:', result.text.length);

  const text = result.text;

  // 测试通用解析函数
  const sectionPattern = /(?:概括题|分析题|提出对策|公文写作|大作文)【[^】]+】/g;
  const sectionMatches = [...text.matchAll(sectionPattern)];

  console.log('\n找到章节:', sectionMatches.length);
  sectionMatches.slice(0, 10).forEach((m, i) => {
    console.log(`  ${i+1}. ${m[0]}`);
  });

  // 尝试多种分隔符
  const patterns = [
    { name: '根据“给定资料', pattern: /根据“给定资料/g },
    { name: '根据材料', pattern: /根据材料/g },
    { name: '阅读“给定资料', pattern: /阅读“给定资料/g },
    { name: '根据"给定资料', pattern: /根据"给定资料/g },
    { name: '阅读"给定资料', pattern: /阅读"给定资料/g },
  ];

  console.log('\n各种分隔符匹配数:');
  patterns.forEach(p => {
    const matches = [...text.matchAll(p.pattern)];
    console.log(`  ${p.name}: ${matches.length}`);
  });

  // 显示前2000字符看看格式
  console.log('\n前2000字符:');
  console.log(text.substring(0, 2000));
}

testPdfParse().catch(console.error);
