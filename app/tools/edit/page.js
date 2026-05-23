'use client';

import { useState, useRef, useEffect } from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import SidebarThumbnails from './components/SidebarThumbnails';
import FloatingToolbar from './components/FloatingToolbar';
import PropertiesBar from './components/PropertiesBar';
import PDFPage from './components/PDFPage';
import SignatureModal from './components/SignatureModal';
import OCRProgress from './components/OCRProgress';

import { PenLine, Upload, Loader, FileText, ChevronLeft } from 'lucide-react';
import ToolHeader from '@/components/tools/ToolHeader';
import UploadZone from '@/components/tools/UploadZone';
import { useToast } from '@/hooks/useToast';
import { formatSize, downloadBlob, uid } from '@/lib/utils';
import { renderPageThumbnail, readFileAsArrayBuffer } from '@/lib/pdf-service';

const GOOGLE_FONTS = {
  'Roboto': {
    regular: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf',
    bold: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.ttf',
    italic: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzcIADbPldk.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/roboto/v30/KFOjCnqEu92Fr1Mu51TzBhc9AMX6lQE.ttf'
  },
  'Open Sans': {
    regular: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVQUwaEQbjA.ttf',
    bold: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsgH1x4gaVQUwaEQbjA.ttf',
    italic: 'https://fonts.gstatic.com/s/opensans/v40/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWy0xpScgDQ6r1QgahQY.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/opensans/v40/memnYaGs126MiZpBA-UFUKWyV9hvIqOx-yeXm7CG2Vy0xpScgDQ6r1QgahQY.ttf'
  },
  'Montserrat': {
    regular: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4MV96dlsBF3gnD_g.ttf',
    bold: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4MV96dlsBF3dJD_g.ttf',
    italic: 'https://fonts.gstatic.com/s/montserrat/v26/JTUFjIg1_i6t8kCHKm4MV96dlsBF3kPLheE.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/montserrat/v26/JTUPjIg1_i6t8kCHKm4MV96dlsBF3pS7teyH8g.ttf'
  },
  'Lora': {
    regular: 'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvzWyCxEKw.ttf',
    bold: 'https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvzWyMyEKw.ttf',
    italic: 'https://fonts.gstatic.com/s/lora/v35/0QI8MX1D_JOuMw_PLUtLbi64IJ-D.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/lora/v35/0QI7MX1D_JOuMw_PLUtLbi64IJuWapw.ttf'
  },
  'Merriweather': {
    regular: 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyUiYHJyHw8U3j6xl1w9oHCETUf.ttf',
    bold: 'https://fonts.gstatic.com/s/merriweather/v30/u-4N0qyUiYHJyHw8U3j6xl1w9oHCETUf5ws.ttf',
    italic: 'https://fonts.gstatic.com/s/merriweather/v30/u-400qyUiYHJyHw8U3j6xl1w9oHCETUf6ws0.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/merriweather/v30/u-4_0qyUiYHJyHw8U3j6xl1w9oHCETUf5ws2yyo.ttf'
  },
  'Inter': {
    regular: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
    bold: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuIedfMZhrib2Bg-4.ttf',
    italic: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuIeSfMZhrib2Bg-4.ttf'
  },
  'Poppins': {
    regular: 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJLMuc7o.ttf',
    bold: 'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFQ.ttf',
    italic: 'https://fonts.gstatic.com/s/poppins/v21/pxiGyp8kv8JHgFVrJJLedw7EXeY.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/poppins/v21/pxiBcyp8kv8JHgFVrJJLAD1rVg01.ttf'
  }
};

const FONT_FALLBACKS = {
  'arial': 'Helvetica',
  'helvetica': 'Helvetica',
  'sans-serif': 'Helvetica',
  'times new roman': 'TimesRoman',
  'times': 'TimesRoman',
  'serif': 'TimesRoman',
  'georgia': 'Merriweather',
  'courier new': 'Courier',
  'courier': 'Courier',
  'monospace': 'Courier',
  'calibri': 'Open Sans',
  'segoe ui': 'Open Sans',
  'tahoma': 'Open Sans',
  'geneva': 'Open Sans',
  'verdana': 'Open Sans',
  'arial black': 'Montserrat',
  'trebuchet': 'Open Sans',
  'impact': 'Montserrat',
  'comic sans': 'Poppins'
};

function extractFontNamesFromOperatorList(operatorList, OPS) {
  const fontNames = new Set();
  if (!operatorList || !operatorList.fnArray || !operatorList.argsArray || !OPS) return fontNames;

  const setFontOp = OPS.setFont;
  for (let index = 0; index < operatorList.fnArray.length; index++) {
    if (operatorList.fnArray[index] === setFontOp) {
      const args = operatorList.argsArray[index];
      if (Array.isArray(args) && typeof args[0] === 'string') {
        fontNames.add(args[0]);
      }
    }
  }

  return fontNames;
}

function resolveFontObject(fontName, commonObjs, objs) {
  if (!fontName) return null;

  const resolver = (obj) => {
    if (!obj || typeof obj.has !== 'function') return null;
    try {
      if (!obj.has(fontName)) return null;
      if (typeof obj.get === 'function') return obj.get(fontName);
      if (typeof obj.getData === 'function') return obj.getData(fontName);
    } catch (err) {
      console.error('Error resolving font object for', fontName, err);
    }
    return null;
  };

  return resolver(commonObjs) || resolver(objs) || null;
}

function parseFontNameFamily(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  const cleaned = rawName.replace(/^[^A-Za-z0-9]+/, '');
  const splitByPlus = cleaned.split('+').pop();
  const splitByComma = splitByPlus.split(',')[0];
  return splitByComma.trim();
}

function normalizeFontName(fontName) {
  return (fontName || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function inferFontFamily(fontName, cssFontFamily) {
  const normalizedRaw = normalizeFontName(cssFontFamily || fontName);
  let family = 'Helvetica';

  if (normalizedRaw.includes('times') || normalizedRaw.includes('serif') || normalizedRaw.includes('roman') || normalizedRaw.includes('georgia')) {
    family = 'TimesRoman';
  } else if (normalizedRaw.includes('courier') || normalizedRaw.includes('mono') || normalizedRaw.includes('code')) {
    family = 'Courier';
  } else if (normalizedRaw.includes('roboto')) {
    family = 'Roboto';
  } else if (normalizedRaw.includes('open sans')) {
    family = 'Open Sans';
  } else if (normalizedRaw.includes('montserrat')) {
    family = 'Montserrat';
  } else if (normalizedRaw.includes('lora')) {
    family = 'Lora';
  } else if (normalizedRaw.includes('merriweather')) {
    family = 'Merriweather';
  } else if (normalizedRaw.includes('inter')) {
    family = 'Inter';
  } else if (normalizedRaw.includes('poppins')) {
    family = 'Poppins';
  } else {
    for (const [key, value] of Object.entries(FONT_FALLBACKS)) {
      if (normalizedRaw.includes(key)) {
        family = value;
        break;
      }
    }
  }

  return family;
}

function inferWeightStyle(fontName, cssFontFamily, style, fontObj) {
  const normalizedName = normalizeFontName(fontName || cssFontFamily);
  const normalizedCssFamily = normalizeFontName(cssFontFamily || '');
  let weight = 400;
  let fontStyle = 'normal';

  const rawWeight = style?.fontWeight;
  const rawStyle = style?.fontStyle;
  if (rawWeight !== undefined && rawWeight !== null) {
    const parsed = Number(rawWeight);
    if (!Number.isNaN(parsed) && parsed > 0) {
      weight = parsed;
    } else if (String(rawWeight).toLowerCase() === 'bold') {
      weight = 700;
    } else if (String(rawWeight).toLowerCase() === 'bolder') {
      weight = 800;
    } else if (String(rawWeight).toLowerCase() === 'normal') {
      weight = 400;
    }
  }

  if (rawStyle === 'italic' || rawStyle === 'oblique') {
    fontStyle = 'italic';
  }

  if (fontObj?.cssFontInfo) {
    const fontInfo = fontObj.cssFontInfo;
    if (fontInfo.fontWeight) {
      const parsed = Number(fontInfo.fontWeight);
      if (!Number.isNaN(parsed) && parsed > 0) {
        weight = parsed;
      } else if (String(fontInfo.fontWeight).toLowerCase() === 'bold') {
        weight = 700;
      }
    }
    if (fontInfo.fontStyle === 'italic' || fontInfo.fontStyle === 'oblique') {
      fontStyle = 'italic';
    }
  }

  const nameBold = normalizedName.includes('bold') || normalizedName.includes('black') || normalizedName.includes('heavy') || normalizedName.includes('semibold') || normalizedName.includes('demibold') || normalizedName.includes('-bd') || normalizedName.includes('_bd') || normalizedName.includes('.bd') || normalizedName.includes(',bold');
  const nameItalic = normalizedName.includes('italic') || normalizedName.includes('oblique') || normalizedName.includes('slanted') || normalizedName.includes('-it') || normalizedName.includes('_it') || normalizedName.includes('.it') || normalizedName.includes('-obl') || normalizedName.includes('_obl') || normalizedName.includes('.obl');

  if (nameBold && weight < 600) {
    weight = normalizedName.includes('black') ? 900 : 700;
  }
  if (nameItalic) {
    fontStyle = 'italic';
  }

  if (fontObj) {
    if (fontObj.isBold || fontObj.bold || (fontObj.flags && (fontObj.flags & 262144))) {
      weight = Math.max(weight, 700);
    }
    if (fontObj.isItalic || fontObj.italic || (fontObj.flags && (fontObj.flags & 64))) {
      fontStyle = 'italic';
    }
  }

  if (normalizedCssFamily.includes('bold') && weight < 600) {
    weight = 700;
  }
  if (normalizedCssFamily.includes('italic') || normalizedCssFamily.includes('oblique')) {
    fontStyle = 'italic';
  }

  return { weight, fontStyle };
}

async function buildFontNameSet(page, OPS) {
  try {
    const operatorList = await page.getOperatorList();
    return extractFontNamesFromOperatorList(operatorList, OPS);
  } catch (err) {
    console.warn('Unable to build font name set from operator list:', err);
    return new Set();
  }
}

function hexFromRgb(r, g, b) {
  const toByte = (value) => {
    const num = Math.round(Number(value) * 255);
    return Math.min(255, Math.max(0, num));
  };
  return `#${[r, g, b].map(toByte).map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hexFromGray(g) {
  const gray = Math.min(255, Math.max(0, Math.round(Number(g) * 255)));
  return `#${[gray, gray, gray].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hexFromCmyk(c, m, y, k) {
  const toByte = (value, key) => {
    const cmyk = Number(value);
    const black = Number(key);
    const rgb = 1 - Math.min(1, cmyk + black);
    return Math.min(255, Math.max(0, Math.round(rgb * 255)));
  };
  return `#${[c, m, y, k].map((val, idx) => toByte(val, idx === 3 ? k : 0)).map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function getPdfFillColorFromArgs(args, colorSpace) {
  if (!Array.isArray(args)) return '#000000';
  if (colorSpace?.includes('DeviceRGB') || args.length === 3) {
    return hexFromRgb(args[0], args[1], args[2]);
  }
  if (colorSpace?.includes('DeviceGray') || args.length === 1) {
    return hexFromGray(args[0]);
  }
  if (colorSpace?.includes('DeviceCMYK') || args.length === 4) {
    return hexFromCmyk(args[0], args[1], args[2], args[3]);
  }
  return '#000000';
}

function getRectOverlap(rectA, rectB) {
  const x1 = Math.max(rectA.x, rectB.x);
  const y1 = Math.max(rectA.y, rectB.y);
  const x2 = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
  const y2 = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);
  return width * height;
}

async function extractPageTextItems(pdfjsPage, pageViewport) {
  const pdfjsLib = await import('pdfjs-dist');
  return extractPageTextItemsWithOPS(pdfjsPage, pageViewport, pdfjsLib.OPS);
}

async function extractPageTextItemsWithOPS(page, viewport, OPS) {
  const [textContent, operatorList] = await Promise.all([
    page.getTextContent({ includeMarkedContent: true }),
    page.getOperatorList(),
  ]);

  const items = textContent.items || [];
  const styles = textContent.styles || {};

  let currentFillColor = '#000000';
  let fillColorSpace = 'DeviceGray';
  let currentFontName = null;
  let pendingRect = null;
  const backgroundRects = [];
  let textItemIndex = 0;

  const fillOps = new Set([
    OPS.fill,
    OPS.eoFill,
    OPS.fillStroke,
    OPS.eoFillStroke,
  ]);
  const textShowOps = new Set([
    OPS.showText,
    OPS.nextLineShowText,
    OPS.showSpacedText,
  ]);

  const assignCurrentColor = () => {
    if (textItemIndex >= items.length) return;
    const item = items[textItemIndex];
    item.color = currentFillColor;
    item.colorsDetected = true;
    const resolvedFontName = item.fontName || currentFontName;
    if (resolvedFontName) {
      if (!item.fontName) {
        item.fontName = resolvedFontName;
      }
      const fontObj = resolveFontObject(resolvedFontName, page.commonObjs, page.objs);
      if (fontObj) {
        const style = (styles && styles[resolvedFontName]) || {};
        const { weight, fontStyle } = inferWeightStyle(resolvedFontName, style.fontFamily, style, fontObj);
        item.fontWeight = weight;
        item.fontWeightValue = weight;
        item.fontStyle = fontStyle;
        item.bold = weight >= 600;
        item.italic = fontStyle === 'italic';
      }
    }
    textItemIndex += 1;
  };

  for (let index = 0; index < operatorList.fnArray.length; index++) {
    const fn = operatorList.fnArray[index];
    const args = operatorList.argsArray[index];

    if (fn === OPS.setFillColorSpace || fn === OPS.setStrokeColorSpace) {
      fillColorSpace = String(args?.[0] || fillColorSpace);
      continue;
    }

    if (fn === OPS.setFillGray) {
      currentFillColor = hexFromGray(args?.[0] ?? 0);
      fillColorSpace = 'DeviceGray';
      continue;
    }

    if (fn === OPS.setFillRGBColor) {
      currentFillColor = hexFromRgb(args?.[0] ?? 0, args?.[1] ?? 0, args?.[2] ?? 0);
      fillColorSpace = 'DeviceRGB';
      continue;
    }

    if (fn === OPS.setFillCMYKColor) {
      currentFillColor = hexFromCmyk(args?.[0] ?? 0, args?.[1] ?? 0, args?.[2] ?? 0, args?.[3] ?? 0);
      fillColorSpace = 'DeviceCMYK';
      continue;
    }

    if (fn === OPS.setFillColor) {
      currentFillColor = getPdfFillColorFromArgs(args, fillColorSpace);
      continue;
    }

    if (fn === OPS.setFont) {
      currentFontName = String(args?.[0] || currentFontName);
      continue;
    }

    if (fn === OPS.rectangle) {
      const [x, y, width, height] = args || [0, 0, 0, 0];
      pendingRect = { x, y, width, height, color: currentFillColor };
      continue;
    }

    if (fillOps.has(fn)) {
      if (pendingRect) {
        backgroundRects.push({ ...pendingRect });
        pendingRect = null;
      }
      continue;
    }

    if (textShowOps.has(fn)) {
      assignCurrentColor();
      continue;
    }

    if (fn === OPS.nextLine) {
      continue;
    }
  }

  items.forEach((item) => {
    if (item.color === undefined || item.color === null) {
      item.color = '#000000';
    }

    if (!item.bgColor) {
      let bestRect = null;
      let bestOverlap = 0;
      const pdfX = item.transform ? item.transform[4] : 0;
      const pdfY = item.transform ? item.transform[5] : 0;
      const textRect = {
        x: pdfX,
        y: pdfY,
        width: item.width || 0,
        height: item.height || 0,
      };
      for (const rect of backgroundRects) {
        const overlap = getRectOverlap(textRect, rect);
        if (overlap > bestOverlap) {
          bestRect = rect;
          bestOverlap = overlap;
        }
      }
      if (bestRect && bestOverlap > 0) {
        item.bgColor = bestRect.color || '#ffffff';
      } else {
        item.bgColor = null;
      }
    }
  });

  const groupedItems = groupTextItems(items, styles, viewport, page.commonObjs, page.objs);

  return groupedItems.map((item) => ({
    ...item,
    id: item.id || `text-item-${uid()}`,
    originalText: item.str,
    newText: item.str,
    edited: false,
    colorsDetected: true,
  }));
}

async function embedCustomFont(outDoc, family, bold, italic, embeddedFontsCache) {
  let fontKey = family || 'Helvetica';
  const standardFonts = ['Helvetica', 'TimesRoman', 'Courier'];
  if (standardFonts.includes(fontKey)) {
    return null;
  }

  const googleFont = GOOGLE_FONTS[fontKey];
  if (!googleFont) {
    return null;
  }

  let fontUrl = googleFont.regular;
  let variantKey = 'regular';
  if (bold && italic) {
    fontUrl = googleFont.boldItalic || googleFont.bold || googleFont.italic || googleFont.regular;
    variantKey = 'boldItalic';
  } else if (bold) {
    fontUrl = googleFont.bold || googleFont.regular;
    variantKey = 'bold';
  } else if (italic) {
    fontUrl = googleFont.italic || googleFont.regular;
    variantKey = 'italic';
  }

  const cacheKey = `${fontKey}_${variantKey}`;
  if (embeddedFontsCache[cacheKey]) {
    return embeddedFontsCache[cacheKey];
  }

  try {
    const res = await fetch(fontUrl);
    if (!res.ok) throw new Error(`Failed to fetch font from ${fontUrl}`);
    const buffer = await res.arrayBuffer();

    const fontkit = (await import('@pdf-lib/fontkit')).default;
    outDoc.registerFontkit(fontkit);

    const embeddedFont = await outDoc.embedFont(buffer);
    embeddedFontsCache[cacheKey] = embeddedFont;
    return embeddedFont;
  } catch (err) {
    console.error(`Error embedding custom font ${fontKey} (${variantKey}):`, err);
    return null;
  }
}

// Merging adjacent text content blocks
function groupTextItems(items, styles, viewport, commonObjs, objs, operatorFontNames = new Set()) {
  if (items.length === 0) return [];
  
  const pageWidth = viewport.width;

  // Filter empty text
  const activeItems = items
    .filter(item => item.str && item.str.trim().length > 0)
    .map((item, idx) => {
      const { str, transform, width, height, fontName } = item;

      const scaleX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
      const scaleY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
      const size = Math.max(scaleX, scaleY) || 12; // precise font size in PDF points

      const pdfX = transform[4];
      const pdfY = transform[5];
      
      // Convert to viewport coordinates for overlay placement.
      // NOTE: Use the raw PDF `height` here; do NOT substitute `size` as fallback
      // because that would shift `top` and break the canvas-erase rectangle position.
      // The lineHeight below already guards against a zero/tiny h.
      const [x1, y1] = viewport.convertToViewportPoint(pdfX, pdfY);
      const [x2, y2] = viewport.convertToViewportPoint(pdfX + width, pdfY + height);
      
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.max(1, Math.abs(x1 - x2));
      const h = Math.max(1, Math.abs(y1 - y2));
      
      const lineHeight = Math.max(h, size * 1.2);
      
      // Resolve actual PDF font resource from text item name.
      const fontObj = resolveFontObject(fontName, commonObjs, objs);
      const resolvedFontName = fontObj ? (fontObj.loadedName || fontObj.name || fontObj.fallbackName || fontName) : fontName;
      const parsedName = parseFontNameFamily(resolvedFontName || fontName);
      const style = (styles && styles[fontName]) || {};
      const cssFontFamily = style.fontFamily || '';
      const cssFontFamilyRaw = resolvedFontName || cssFontFamily || fontName || '';

      const preWeight = item.fontWeightValue !== undefined ? item.fontWeightValue : null;
      const preStyle = item.fontStyle !== undefined ? item.fontStyle : null;
      
      let fontWeight = preWeight;
      let fontStyle = preStyle;
      if (fontWeight === null || fontStyle === null) {
        const inferred = inferWeightStyle(resolvedFontName, cssFontFamily, style, fontObj);
        if (fontWeight === null) fontWeight = inferred.weight;
        if (fontStyle === null) fontStyle = inferred.fontStyle;
      }
      const bold = fontWeight >= 600;
      const italic = fontStyle === 'italic';

      const fontFamily = inferFontFamily(parsedName || resolvedFontName || cssFontFamily, cssFontFamily);
      
      // Auto-detect alignment
      let alignment = 'left';
      const leftMargin = left;
      const rightMargin = pageWidth - (left + w);
      if (Math.abs(leftMargin - rightMargin) < 30) {
        alignment = 'center';
      } else if (rightMargin < leftMargin && rightMargin < 50) {
        alignment = 'right';
      }
      
      return {
        id: `text-item-${idx}`,
        str,
        originalText: str,
        newText: str,
        pdfX,
        pdfY,
        pdfWidth: width,
        pdfHeight: height,
        left,
        top,
        width: w,
        height: lineHeight,
        fontSize: size,
        fontName,
        edited: false,
        color: item.color || '#000000',
        bgColor: item.bgColor || null,
        bold,
        italic,
        fontWeight: fontWeight,
        fontWeightValue: fontWeight,
        fontStyle,
        cssFontFamilyRaw,
        fontFamily,
        alignment,
      };
    });

  // Sort by Y top, then X left
  activeItems.sort((a, b) => {
    if (Math.abs(a.top - b.top) > 5) {
      return a.top - b.top;
    }
    return a.left - b.left;
  });
  
  const groups = [];
  if (activeItems.length === 0) return [];
  
  let currentGroup = [activeItems[0]];
  
  for (let i = 1; i < activeItems.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = activeItems[i];
    
    const sameLine = Math.abs(curr.top - prev.top) < 6;
    const closeX = curr.left - (prev.left + prev.width) < 25;
    
    if (sameLine && closeX) {
      currentGroup.push(curr);
    } else {
      groups.push(mergeGroup(currentGroup, pageWidth));
      currentGroup = [curr];
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(mergeGroup(currentGroup, pageWidth));
  }
  
  return groups;
}

function mergeGroup(group, pageWidth) {
  if (group.length === 1) return group[0];
  
  const first = group[0];
  const last = group[group.length - 1];
  
  let mergedStr = '';
  for (let i = 0; i < group.length; i++) {
    const item = group[i];
    if (i > 0) {
      const prev = group[i - 1];
      const gap = item.left - (prev.left + prev.width);
      if (gap > 4) {
        mergedStr += ' ';
      }
    }
    mergedStr += item.str;
  }
  
  const mergedLeft = first.left;
  const mergedTop = first.top;
  const mergedWidth = (last.left + last.width) - first.left;
  const mergedHeight = Math.max(...group.map(g => g.height));
  
  const totalLength = group.reduce((sum, g) => sum + g.str.length, 0) || 1;
  const mergedFontSize = group.reduce((sum, g) => sum + g.fontSize * g.str.length, 0) / totalLength || first.fontSize;
  
  const boldLength   = group.filter(g => g.bold).reduce((sum, g) => sum + g.str.length, 0);
  const italicLength = group.filter(g => g.italic).reduce((sum, g) => sum + g.str.length, 0);
  
  const mergedBold   = boldLength   > totalLength / 2;
  const mergedItalic = italicLength > totalLength / 2;

  // Weighted-average numeric font weight (preserves semibold/black etc.)
  const mergedFontWeightValue = Math.round(
    group.reduce((sum, g) => sum + (g.fontWeightValue || (g.bold ? 700 : 400)) * g.str.length, 0) / totalLength
  );

  const mergedColor = group.find(g => g.color)?.color || first.color || '#000000';
  const mergedBgColor = group.find(g => g.bgColor)?.bgColor || first.bgColor || null;
  
  // Auto-detect alignment for merged group
  let alignment = 'left';
  const leftMargin = mergedLeft;
  const rightMargin = pageWidth - (mergedLeft + mergedWidth);
  if (Math.abs(leftMargin - rightMargin) < 30) {
    alignment = 'center';
  } else if (rightMargin < leftMargin && rightMargin < 50) {
    alignment = 'right';
  }
  
  return {
    id: `merged-text-${first.id}`,
    str: mergedStr,
    originalText: mergedStr,
    newText: mergedStr,
    pdfX: first.pdfX,
    pdfY: first.pdfY,
    pdfWidth: (last.pdfX + last.pdfWidth) - first.pdfX,
    pdfHeight: Math.max(...group.map(g => g.pdfHeight)),
    left: mergedLeft,
    top: mergedTop,
    width: mergedWidth,
    height: mergedHeight,
    fontSize: mergedFontSize,
    fontName: first.fontName,
    edited: false,
    color: mergedColor,
    bgColor: mergedBgColor,
    bold: mergedBold,
    italic: mergedItalic,
    fontWeightValue: mergedFontWeightValue,
    cssFontFamilyRaw: first.cssFontFamilyRaw || null,
    fontFamily: first.fontFamily,
    alignment,
    subItems: group.map(g => ({ pdfX: g.pdfX, pdfY: g.pdfY, pdfWidth: g.pdfWidth, pdfHeight: g.pdfHeight, str: g.str })),
  };
}

function EditorWorkspace() {
  const toast = useToast();
  
  const {
    file, setFile,
    loading, setLoading,
    exporting, setExporting,
    pagesData, initializePages,
    setPageCount,
    addAnnotation,
    selectedElement,
    commitAnnotationUpdate
  } = useEditor();

  const [pdfjsDoc, setPdfjsDoc] = useState(null);
  const pdfjsDocRef = useRef(null);
  const stablePdfjsDoc = pdfjsDocRef.current || pdfjsDoc;
  const [thumbnails, setThumbnails] = useState({});
  const fileInputRef = useRef(null);

  // Signature modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  
  // OCR modal state
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrActivePage, setOcrActivePage] = useState(null);
  const [ocrStatus, setOcrStatus] = useState({ running: false, step: '', progress: 0 });

  const loadPDF = async ([f]) => {
    setFile(f);
    setLoading(true);
    setThumbnails({});
    setPdfjsDoc(null);
    pdfjsDocRef.current = null;
    
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const buffer = await readFileAsArrayBuffer(f);
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      pdfjsDocRef.current = doc;
      setPdfjsDoc(doc);
      setPageCount(doc.numPages);

      const parsedPages = [];

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const originalTextItems = await extractPageTextItems(page, viewport);

        parsedPages.push({
          pageNum: i,
          originalPageNum: i, // reference to source index for reordering
          width: viewport.width,
          height: viewport.height,
          rotation: page.rotation || 0,
          originalTextItems,
          annotations: []
        });
      }

      initializePages(parsedPages);
      toast.success('PDF loaded successfully!');
      
      // Async generation of thumbnails
      generateThumbnails(f, doc.numPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse PDF.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const generateThumbnails = async (f, count) => {
    for (let i = 1; i <= count; i++) {
      try {
        const thumb = await renderPageThumbnail(f, i, 0.2);
        setThumbnails(prev => ({ ...prev, [i]: thumb }));
      } catch (err) {
        console.error('Thumbnail failed', i);
      }
    }
  };

  const handlePageRendered = (pageNum, dataUrl) => {
    setThumbnails(prev => ({ ...prev, [pageNum]: dataUrl }));
  };

  // Image insertion triggers
  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageFile = (e) => {
    const imgFile = e.target.files[0];
    if (imgFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addAnnotation(1, {
          type: 'image',
          dataUrl: event.target.result,
          width: 160,
          height: 120
        });
        toast.success('Image added to page 1. Drag to position.');
      };
      reader.readAsDataURL(imgFile);
    }
    e.target.value = ''; // Reset input
  };

  // Signature drawing save
  const handleSaveSignature = (sigDataUrl) => {
    if (selectedElement && selectedElement.type === 'annotation') {
      const page = pagesData.find(p => p.pageNum === selectedElement.pageNum);
      const ann = page?.annotations?.find(a => a.id === selectedElement.id);
      if (ann && ann.type === 'form-field' && ann.fieldType === 'signature') {
        commitAnnotationUpdate(selectedElement.pageNum, selectedElement.id, {
          signatureData: sigDataUrl
        });
        toast.success('Signature field successfully signed!');
        return;
      }
    }

    const pageToUse = selectedElement?.pageNum || 1;
    addAnnotation(pageToUse, {
      type: 'signature',
      dataUrl: sigDataUrl,
      width: 140,
      height: 60
    });
    toast.success(`Signature added to page ${pageToUse}. Drag to position.`);
  };

  // OCR Execution handler
  const handleStartOCR = async (lang) => {
    if (!ocrActivePage || !pdfjsDoc) return;
    setOcrStatus({ running: true, step: 'Initializing OCR engine...', progress: 0 });
    
    try {
      const page = await pdfjsDoc.getPage(ocrActivePage);
      
      // High-DPI render for OCR
      const OCR_SCALE = 2.5;
      const vp = page.getViewport({ scale: OCR_SCALE });
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext('2d');
      
      setOcrStatus({ running: true, step: 'Rendering high resolution image...', progress: 20 });
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      
      setOcrStatus({ running: true, step: 'Loading Tesseract models...', progress: 40 });
      const Tesseract = (await import('tesseract.js')).default;
      
      const { data } = await Tesseract.recognize(canvas, lang, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrStatus({ 
              running: true, 
              step: 'Recognizing text layout...', 
              progress: Math.round(40 + m.progress * 60) 
            });
          }
        },
      });

      // Construct text blocks from lines
      const textLines = data.lines.map((line, idx) => {
        const bbox = line.bbox;
        const left_pdf = bbox.x0 / OCR_SCALE;
        const top_pdf = bbox.y0 / OCR_SCALE;
        const width_pdf = (bbox.x1 - bbox.x0) / OCR_SCALE;
        const height_pdf = (bbox.y1 - bbox.y0) / OCR_SCALE;
        
        return {
          id: `ocr-text-${ocrActivePage}-${idx}`,
          str: line.text,
          originalText: line.text,
          newText: line.text,
          pdfX: left_pdf,
          pdfY: page.view[3] - (top_pdf + height_pdf), // page.view[3] is original height
          pdfWidth: width_pdf,
          pdfHeight: height_pdf,
          left: left_pdf,
          top: top_pdf,
          width: width_pdf,
          height: height_pdf,
          fontSize: Math.round(height_pdf * 0.7) || 12,
          fontName: 'Helvetica',
          edited: false,
          color: '#000000',
          bold: false,
          italic: false,
          fontFamily: 'Helvetica',
        };
      });

      // Update pagesData
      const updated = pagesData.map(p => {
        if (p.pageNum === ocrActivePage) {
          return {
            ...p,
            originalTextItems: textLines
          };
        }
        return p;
      });
      
      initializePages(updated);
      toast.success('OCR Complete! Page is now editable.');
      setOcrModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('OCR failed. Please check the image.');
    } finally {
      setOcrStatus({ running: false, step: '', progress: 0 });
    }
  };

  const triggerOCRModal = (pageNum) => {
    setOcrActivePage(pageNum);
    setOcrModalOpen(true);
  };

  // Compile final PDF via pdf-lib
  const handleExport = async () => {
    if (!file || pagesData.length === 0) return;
    setExporting(true);
    
    try {
      const { PDFDocument, rgb, StandardFonts, degrees, PDFString } = await import('pdf-lib');
      
      // Load source arraybuffer
      const srcBuffer = await readFileAsArrayBuffer(file);
      const srcDoc = await PDFDocument.load(srcBuffer, { ignoreEncryption: true });
      
      // Create new document for reordered/deleted structure support
      const outDoc = await PDFDocument.create();
      
      // Map copied pages index
      const indices = pagesData.map(p => p.originalPageNum - 1);
      const copiedPages = await outDoc.copyPages(srcDoc, indices);
      copiedPages.forEach(p => outDoc.addPage(p));
      
      const pages = outDoc.getPages();
      const embeddedFontsCache = {};

      // Load fonts
      const fonts = {
        Helvetica: await outDoc.embedFont(StandardFonts.Helvetica),
        HelveticaBold: await outDoc.embedFont(StandardFonts.HelveticaBold),
        HelveticaOblique: await outDoc.embedFont(StandardFonts.HelveticaOblique),
        HelveticaBoldOblique: await outDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        TimesRoman: await outDoc.embedFont(StandardFonts.TimesRoman),
        TimesRomanBold: await outDoc.embedFont(StandardFonts.TimesRomanBold),
        TimesRomanItalic: await outDoc.embedFont(StandardFonts.TimesRomanItalic),
        TimesRomanBoldItalic: await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        Courier: await outDoc.embedFont(StandardFonts.Courier),
        CourierBold: await outDoc.embedFont(StandardFonts.CourierBold),
        CourierOblique: await outDoc.embedFont(StandardFonts.CourierOblique),
        CourierBoldOblique: await outDoc.embedFont(StandardFonts.CourierBoldOblique),
      };

      // selectFont: pick the best available standard font variant.
      // fontWeightValue: numeric CSS weight (100–900). >= 600 → use Bold variant.
      const selectFont = (family, fontWeightValue, italic) => {
        const isBold = (fontWeightValue || 400) >= 600;
        let fName = family || 'Helvetica';
        if (fName !== 'Helvetica' && fName !== 'TimesRoman' && fName !== 'Courier') {
          fName = 'Helvetica'; // fallback to standard
        }
        const suffix = fName === 'TimesRoman' ? 'Italic' : 'Oblique';
        if (isBold && italic) return fonts[`${fName}Bold${suffix}`] || fonts.HelveticaBoldOblique;
        if (isBold)           return fonts[`${fName}Bold`] || fonts.HelveticaBold;
        if (italic)           return fonts[`${fName}${suffix}`] || fonts.HelveticaOblique;
        return fonts[fName];
      };

      const hexToRgb = (hex) => {
        const cleanHex = hex.replace('#', '');
        const n = parseInt(cleanHex, 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
      };

      // Draw edits on each page
      for (let idx = 0; idx < pagesData.length; idx++) {
        const pageMeta = pagesData[idx];
        const page = pages[idx];
        const H_pdf = pageMeta.height;

        // Apply rotation
        page.setRotation(degrees(pageMeta.rotation || 0));

        // 1. Hide original edited text items and draw new text
        if (pageMeta.originalTextItems) {
          for (const item of pageMeta.originalTextItems) {
            if (item.edited) {
              // Derive bold from numeric fontWeightValue (>= 600 = bold variant)
              const itemIsBold = (item.fontWeightValue || 0) >= 600 || item.bold;

              // ── Mask: paint background rectangle over original text ──
              // Expand by extra padding to fully cover ascenders & descenders
              const [bgR, bgG, bgB] = hexToRgb(item.bgColor || '#ffffff');
              const maskColor = rgb(bgR, bgG, bgB);

              // Extra vertical padding (20% of height) to cover ascenders above baseline
              // and descenders below. Extra horizontal padding for anti-aliasing fringe.
              const padX = 2;
              const padYTop = Math.max(2, item.pdfHeight * 0.20);
              const padYBot = Math.max(1, item.pdfHeight * 0.08);

              if (item.subItems) {
                for (const sub of item.subItems) {
                  page.drawRectangle({
                    x: sub.pdfX - padX,
                    y: sub.pdfY - padYBot,
                    width: sub.pdfWidth + padX * 2,
                    height: sub.pdfHeight + padYTop + padYBot,
                    color: maskColor,
                  });
                }
              } else {
                page.drawRectangle({
                  x: item.pdfX - padX,
                  y: item.pdfY - padYBot,
                  width: item.pdfWidth + padX * 2,
                  height: item.pdfHeight + padYTop + padYBot,
                  color: maskColor,
                });
              }

              // ── Draw replacement text ──
              let textFont = selectFont(item.fontFamily, item.fontWeightValue, item.italic);
              const customFont = await embedCustomFont(outDoc, item.fontFamily, itemIsBold, item.italic, embeddedFontsCache);
              if (customFont) {
                textFont = customFont;
              }
              
              const [r, g, b] = hexToRgb(item.color || '#000000');
              
              let xPos = item.pdfX;
              if (item.alignment === 'center' && item.pdfWidth) {
                const textWidth = textFont.widthOfTextAtSize(item.newText || '', item.fontSize);
                xPos = item.pdfX + (item.pdfWidth - textWidth) / 2;
              } else if (item.alignment === 'right' && item.pdfWidth) {
                const textWidth = textFont.widthOfTextAtSize(item.newText || '', item.fontSize);
                xPos = item.pdfX + (item.pdfWidth - textWidth);
              }

              page.drawText(item.newText || '', {
                x: xPos,
                y: item.pdfY,
                size: item.fontSize,
                font: textFont,
                color: rgb(r, g, b),
              });

              if (item.underline) {
                const textWidth = textFont.widthOfTextAtSize(item.newText || '', item.fontSize);
                const underlineY = item.pdfY - 1.5;
                page.drawLine({
                  start: { x: xPos, y: underlineY },
                  end: { x: xPos + textWidth, y: underlineY },
                  thickness: Math.max(0.8, item.fontSize / 15),
                  color: rgb(r, g, b),
                });
              }
            }
          }
        }

        // 2. Render overlays & drawings (annotations)
        if (pageMeta.annotations) {
          for (const ann of pageMeta.annotations) {
            const [r, g, b] = hexToRgb(ann.color || '#000000');

            if (ann.type === 'text') {
              // Annotations store boolean bold; convert to numeric weight for selectFont
              const annWeight = ann.fontWeightValue || (ann.bold ? 700 : 400);
              let textFont = selectFont(ann.fontFamily, annWeight, ann.italic);
              const customFont = await embedCustomFont(outDoc, ann.fontFamily, ann.bold, ann.italic, embeddedFontsCache);
              if (customFont) {
                textFont = customFont;
              }

              // Screen Y mapping to bottom-left PDF coordinate
              const pdfY = H_pdf - ann.y - ann.fontSize;
              
              let xPos = ann.x;
              if (ann.alignment === 'center' && ann.width) {
                const textWidth = textFont.widthOfTextAtSize(ann.text || '', ann.fontSize);
                xPos = ann.x + (ann.width - textWidth) / 2;
              } else if (ann.alignment === 'right' && ann.width) {
                const textWidth = textFont.widthOfTextAtSize(ann.text || '', ann.fontSize);
                xPos = ann.x + (ann.width - textWidth);
              }

              page.drawText(ann.text || '', {
                x: xPos,
                y: pdfY,
                size: ann.fontSize,
                font: textFont,
                color: rgb(r, g, b),
              });

              if (ann.underline) {
                const textWidth = textFont.widthOfTextAtSize(ann.text || '', ann.fontSize);
                const underlineY = pdfY - 1.5;
                page.drawLine({
                  start: { x: xPos, y: underlineY },
                  end: { x: xPos + textWidth, y: underlineY },
                  thickness: Math.max(0.8, ann.fontSize / 15),
                  color: rgb(r, g, b),
                });
              }
            } else if (ann.type === 'whiteout') {
              page.drawRectangle({
                x: ann.x,
                y: H_pdf - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
                color: rgb(1, 1, 1),
              });
            } else if ((ann.type === 'image' || ann.type === 'signature') && ann.dataUrl) {
              const base64Data = ann.dataUrl.split(',')[1];
              const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const isPng = ann.dataUrl.includes('image/png');
              
              const embeddedImg = isPng 
                ? await outDoc.embedPng(imgBytes)
                : await outDoc.embedJpg(imgBytes);

              page.drawImage(embeddedImg, {
                x: ann.x,
                y: H_pdf - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
              });
            } else if (ann.type === 'path' || ann.type === 'highlight') {
              const isHighlight = ann.type === 'highlight';
              const thick = ann.strokeWidth || 3;
              
              for (let i = 0; i < ann.points.length - 1; i++) {
                const p1 = ann.points[i];
                const p2 = ann.points[i + 1];
                page.drawLine({
                  start: { x: p1.x, y: H_pdf - p1.y },
                  end: { x: p2.x, y: H_pdf - p2.y },
                  thickness: thick,
                  color: rgb(r, g, b),
                  opacity: isHighlight ? 0.45 : 1,
                });
              }
            } else if (ann.type === 'shape') {
              const thick = ann.strokeWidth || 3;

              if (ann.shapeType === 'rect') {
                page.drawRectangle({
                  x: ann.x,
                  y: H_pdf - ann.y - ann.height,
                  width: ann.width,
                  height: ann.height,
                  borderColor: rgb(r, g, b),
                  borderWidth: thick,
                });
              } else if (ann.shapeType === 'circle') {
                page.drawCircle({
                  x: ann.x + ann.width / 2,
                  y: H_pdf - ann.y - ann.height / 2,
                  radius: ann.width / 2,
                  borderColor: rgb(r, g, b),
                  borderWidth: thick,
                });
              } else if (ann.shapeType === 'line' && ann.points && ann.points.length >= 2) {
                const p1 = ann.points[0];
                const p2 = ann.points[1];
                page.drawLine({
                  start: { x: p1.x, y: H_pdf - p1.y },
                  end: { x: p2.x, y: H_pdf - p2.y },
                  thickness: thick,
                  color: rgb(r, g, b),
                });
              } else if (ann.shapeType === 'arrow' && ann.points && ann.points.length >= 2) {
                const p1 = ann.points[0];
                const p2 = ann.points[1];
                
                // Draw base line
                page.drawLine({
                  start: { x: p1.x, y: H_pdf - p1.y },
                  end: { x: p2.x, y: H_pdf - p2.y },
                  thickness: thick,
                  color: rgb(r, g, b),
                });
                
                // Draw arrow head points
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const arrowLength = 10;
                
                const headX1 = p2.x - arrowLength * Math.cos(angle - Math.PI / 6);
                const headY1 = p2.y - arrowLength * Math.sin(angle - Math.PI / 6);
                const headX2 = p2.x - arrowLength * Math.cos(angle + Math.PI / 6);
                const headY2 = p2.y - arrowLength * Math.sin(angle + Math.PI / 6);

                page.drawLine({
                  start: { x: p2.x, y: H_pdf - p2.y },
                  end: { x: headX1, y: H_pdf - headY1 },
                  thickness: thick,
                  color: rgb(r, g, b),
                });

                page.drawLine({
                  start: { x: p2.x, y: H_pdf - p2.y },
                  end: { x: headX2, y: H_pdf - headY2 },
                  thickness: thick,
                  color: rgb(r, g, b),
                });
              }
            } else if (ann.type === 'stamp') {
              // Draw visual stamp border
              page.drawRectangle({
                x: ann.x,
                y: H_pdf - ann.y - ann.height,
                width: ann.width,
                height: ann.height,
                borderColor: rgb(r, g, b),
                borderWidth: 2,
              });
              // Draw Stamp main subject text (centered bold)
              const stampFont = fonts.HelveticaBold;
              const titleSize = 14;
              const titleWidth = stampFont.widthOfTextAtSize(ann.subject || 'STAMP', titleSize);
              page.drawText(ann.subject || 'STAMP', {
                x: ann.x + (ann.width - titleWidth) / 2,
                y: H_pdf - ann.y - 25,
                size: titleSize,
                font: stampFont,
                color: rgb(r, g, b),
              });
              // Draw Stamp metadata subtext (centered normal)
              const subText = `${ann.author || 'AUTHOR'} • ${ann.dateTime || ''}`;
              const subFont = fonts.Helvetica;
              const subSize = 7;
              const subWidth = subFont.widthOfTextAtSize(subText, subSize);
              page.drawText(subText, {
                x: ann.x + (ann.width - subWidth) / 2,
                y: H_pdf - ann.y - 45,
                size: subSize,
                font: subFont,
                color: rgb(r, g, b),
              });
            } else if (ann.type === 'link') {
              // Add real interactive PDF Link Annotation
              try {
                if (ann.linkType === 'page') {
                  const targetIdx = parseInt(ann.linkTarget) - 1;
                  const targetPage = pages[targetIdx];
                  if (targetPage) {
                    const linkAnnot = outDoc.context.obj({
                      Type: 'Annot',
                      Subtype: 'Link',
                      Rect: [ann.x, H_pdf - ann.y - ann.height, ann.x + ann.width, H_pdf - ann.y],
                      Border: [0, 0, 0],
                      Dest: [targetPage.ref, 'XYZ', null, null, null],
                    });
                    const annotRef = outDoc.context.register(linkAnnot);
                    page.node.addAnnot(annotRef);
                  }
                } else {
                  let target = ann.linkTarget || 'https://google.com';
                  if (ann.linkType === 'email' && !target.startsWith('mailto:')) target = 'mailto:' + target;
                  if (ann.linkType === 'phone' && !target.startsWith('tel:')) target = 'tel:' + target;
                  if (ann.linkType === 'url' && !/^https?:\/\//i.test(target)) target = 'https://' + target;

                  const linkAnnot = outDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Link',
                    Rect: [ann.x, H_pdf - ann.y - ann.height, ann.x + ann.width, H_pdf - ann.y],
                    Border: [0, 0, 0],
                    A: {
                      Type: 'Action',
                      S: 'URI',
                      URI: PDFString.of(target),
                    }
                  });
                  const annotRef = outDoc.context.register(linkAnnot);
                  page.node.addAnnot(annotRef);
                }
              } catch (linkErr) {
                console.error('Error compiling PDF link annotation', linkErr);
              }
            } else if (ann.type === 'form-field') {
              // Add interactive form fields using pdf-lib Forms API
              try {
                const form = outDoc.getForm();
                if (ann.fieldType === 'text' || ann.fieldType === 'textarea') {
                  const textField = form.createTextField(ann.fieldName);
                  textField.setText(ann.defaultValue || '');
                  textField.addToPage(page, {
                    x: ann.x,
                    y: H_pdf - ann.y - ann.height,
                    width: ann.width,
                    height: ann.height,
                  });
                  if (ann.readOnly) textField.enableReadOnly();
                  if (ann.mandatory) textField.enableRequired();
                  if (ann.maxLength) textField.setMaxLength(ann.maxLength);
                  if (ann.fieldType === 'textarea') textField.enableMultiline();
                } else if (ann.fieldType === 'checkbox') {
                  const checkBox = form.createCheckBox(ann.fieldName);
                  if (ann.checked) checkBox.check();
                  else checkBox.uncheck();
                  checkBox.addToPage(page, {
                    x: ann.x,
                    y: H_pdf - ann.y - ann.height,
                    width: ann.width,
                    height: ann.height,
                  });
                  if (ann.readOnly) checkBox.enableReadOnly();
                  if (ann.mandatory) checkBox.enableRequired();
                } else if (ann.fieldType === 'radio') {
                  let radioGroup;
                  try {
                    radioGroup = form.getRadioGroup(ann.groupName);
                  } catch {
                    radioGroup = form.createRadioGroup(ann.groupName);
                  }
                  const optionName = ann.fieldName || `opt_${ann.id}`;
                  radioGroup.addOptionToPage(optionName, page, {
                    x: ann.x,
                    y: H_pdf - ann.y - ann.height,
                    width: ann.width,
                    height: ann.height,
                  });
                  if (ann.checked) {
                    radioGroup.select(optionName);
                  }
                  if (ann.readOnly) radioGroup.enableReadOnly();
                  if (ann.mandatory) radioGroup.enableRequired();
                } else if (ann.fieldType === 'dropdown') {
                  const dropdown = form.createDropdown(ann.fieldName);
                  dropdown.setOptions(ann.optionsList || []);
                  if (ann.defaultValue) dropdown.select(ann.defaultValue);
                  dropdown.addToPage(page, {
                    x: ann.x,
                    y: H_pdf - ann.y - ann.height,
                    width: ann.width,
                    height: ann.height,
                  });
                  if (ann.readOnly) dropdown.enableReadOnly();
                  if (ann.mandatory) dropdown.enableRequired();
                } else if (ann.fieldType === 'signature') {
                  // Standard flattened drawn signature
                  if (ann.signatureData) {
                    const base64Data = ann.signatureData.split(',')[1];
                    const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const isPng = ann.signatureData.includes('image/png');
                    const embeddedImg = isPng 
                      ? await outDoc.embedPng(imgBytes)
                      : await outDoc.embedJpg(imgBytes);

                    page.drawImage(embeddedImg, {
                      x: ann.x,
                      y: H_pdf - ann.y - ann.height,
                      width: ann.width,
                      height: ann.height,
                    });
                  } else {
                    // Draw clean grey visual box
                    page.drawRectangle({
                      x: ann.x,
                      y: H_pdf - ann.y - ann.height,
                      width: ann.width,
                      height: ann.height,
                      borderColor: rgb(0.8, 0.8, 0.8),
                      borderWidth: 1,
                      color: rgb(0.97, 0.97, 0.97),
                    });
                  }
                }
              } catch (formErr) {
                console.error('Error compiling form field annotation', formErr);
              }
            }
          }
        }
      }

      const bytes = await outDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, `edited-${file.name}`);
      toast.success('PDF successfully saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-dark-950">
      
      {/* File input for images */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageFile} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Signature overlay pad */}
      <SignatureModal 
        isOpen={sigModalOpen} 
        onClose={() => setSigModalOpen(false)} 
        onSave={handleSaveSignature} 
      />

      {/* OCR processing state modal */}
      <OCRProgress 
        isOpen={ocrModalOpen} 
        onClose={() => setOcrModalOpen(false)} 
        onStart={handleStartOCR} 
        status={ocrStatus} 
      />

      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[500px]">
          <div className="max-w-2xl w-full">
            <UploadZone onFiles={loadPDF} accept=".pdf" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Main workspace toolbar panel */}
          <FloatingToolbar 
            handleExport={handleExport} 
            openSignatureModal={() => setSigModalOpen(true)}
            triggerImageUpload={triggerImageUpload}
          />

          {/* Element parameters styling contextual bar */}
          <PropertiesBar />

          {/* Central canvas scrolling board with Sidebar */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            
            {/* Page thumbnails panel left */}
            <SidebarThumbnails thumbnails={thumbnails} />

            {/* Main canvas center panel */}
            <div className="flex-1 bg-dark-900 overflow-y-auto custom-scroll flex flex-col items-center p-6 scroll-smooth bg-grid">
              
              {/* PDF info bar */}
              <div className="max-w-4xl w-full mb-4 flex items-center justify-between bg-dark-950/80 backdrop-blur border border-white/5 px-4 py-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-brand-400" />
                  <span className="font-semibold text-white truncate max-w-xs">{file.name}</span>
                  <span className="text-dark-500 font-mono">({formatSize(file.size)})</span>
                </div>
                <button 
                  onClick={() => setFile(null)} 
                  className="px-2 py-1 rounded bg-white/5 text-dark-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Close Document
                </button>
              </div>

              {/* PDF Pages vertical list board */}
              <div className="max-w-4xl w-full flex-1 flex flex-col gap-6 relative">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-brand-400">
                    <Loader size={36} className="animate-spin mb-3" />
                    <p className="text-sm font-semibold">Extracting text layout elements...</p>
                  </div>
                ) : (
                  pagesData.map((page) => (
                    <PDFPage 
                      key={page.pageNum}
                      pageNum={page.pageNum}
                      pdfjsDoc={stablePdfjsDoc}
                      onOCRRequest={triggerOCRModal}
                      onPageRendered={handlePageRendered}
                      openSignatureModal={() => setSigModalOpen(true)}
                    />
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditPDFPage() {
  return (
    <EditorProvider>
      <div className="min-h-screen bg-dark-950 text-dark-50 flex flex-col select-none">
        <ToolHeader 
          icon={PenLine} 
          title="Interactive PDF Editor"
          description="Directly edit text blocks, erase, draw, add shapes, insert images or sign PDF pages natively." 
        />
        <div className="flex-1 flex flex-col min-h-0">
          <EditorWorkspace />
        </div>
      </div>
    </EditorProvider>
  );
}
