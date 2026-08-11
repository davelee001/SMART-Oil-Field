import type ExcelJS from 'exceljs';

export const createWorkbook = async () => {
    const module = await import('exceljs');
    return new module.default.Workbook();
};

export const styleWorksheet = (worksheet: ExcelJS.Worksheet) => {
    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173F5F' } };
    header.alignment = { vertical: 'middle' };
    header.height = 22;
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: worksheet.columnCount } };
};

export const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
