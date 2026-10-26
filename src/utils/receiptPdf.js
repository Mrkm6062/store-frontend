import { jsPDF } from 'jspdf';

/**
 * Builds a clean, professional 80mm thermal-style receipt PDF using jsPDF.
 */
export const generateReceiptPdf = (order, store = {}, staff = null) => {
  if (!order) return null;

  const items = order.orderItems || [];
  // Calculate dynamic height to fit all items and avoid page overflow
  const baseHeight = 110 + (items.length * 7);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, Math.max(140, baseHeight)]
  });

  const storeName = store.storeName || store.name || 'Store Receipt';
  const orderNo = order._id ? order._id.slice(-6).toUpperCase() : '000000';
  const storeId = store.storeId || store.storeSlug || '';

  let y = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(storeName, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (store.locationAddress) {
    const lines = doc.splitTextToSize(store.locationAddress, 70);
    doc.text(lines, 40, y, { align: 'center' });
    y += (lines.length * 3.5);
  }

  if (store.storePhone || store.whatsappNumber) {
    doc.text(`Tel: ${store.storePhone || store.whatsappNumber}`, 40, y, { align: 'center' });
    y += 3.5;
  }

  if (storeId) {
    doc.text(`Store Code: ${storeId}`, 40, y, { align: 'center' });
    y += 3.5;
  }

  // Dashed separator
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('RETAIL INVOICE / RECEIPT', 40, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Receipt #: ${orderNo}`, 5, y);
  doc.text(new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN'), 75, y, { align: 'right' });
  y += 3.5;

  const orderTypeStr = order.tableNumber && order.tableNumber !== '0'
    ? `Dine-in (Table ${order.tableNumber})`
    : (order.orderType || 'Counter / Takeaway');
  doc.text(`Type: ${orderTypeStr}`, 5, y);
  doc.text(new Date(order.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), 75, y, { align: 'right' });
  y += 3.5;

  const billedBy = order.orderBy || (staff?.name ? `${staff.name}${staff.staffId ? ` (${staff.staffId})` : ''}` : 'Counter Staff');
  doc.text(`Billed By: ${billedBy}`, 5, y);
  y += 3.5;

  if (order.customerPhone) {
    doc.text(`Mobile: ${order.customerPhone}`, 5, y);
    y += 3.5;
  }

  doc.line(5, y, 75, y);
  y += 4;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ITEM', 5, y);
  doc.text('QTY', 44, y, { align: 'center' });
  doc.text('PRICE', 58, y, { align: 'right' });
  doc.text('TOTAL', 75, y, { align: 'right' });
  y += 2;
  doc.line(5, y, 75, y);
  y += 3.5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  items.forEach((item) => {
    const rawName = item.name || 'Item';
    const itemName = rawName.length > 21 ? rawName.slice(0, 20) + '…' : rawName;
    doc.text(itemName, 5, y);
    doc.text(String(item.qty || 1), 44, y, { align: 'center' });
    doc.text(Number(item.price || 0).toFixed(2), 58, y, { align: 'right' });
    doc.text(Number((item.price || 0) * (item.qty || 1)).toFixed(2), 75, y, { align: 'right' });
    y += 3.8;
  });

  doc.line(5, y, 75, y);
  y += 4;

  // Totals
  if (order.discountAmount > 0) {
    const subtotal = (order.totalAmount || 0) + (order.discountAmount || 0);
    doc.text('Subtotal:', 5, y);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 3.5;

    doc.text(`Discount (${order.couponCode || 'Promo'}):`, 5, y);
    doc.text(`-Rs. ${Number(order.discountAmount).toFixed(2)}`, 75, y, { align: 'right' });
    y += 3.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('GRAND TOTAL:', 5, y);
  doc.text(`Rs. ${Number(order.totalAmount || 0).toFixed(2)}`, 75, y, { align: 'right' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const payMethod = String(order.paymentMethod || 'cash').toUpperCase();
  doc.text(`Payment: ${payMethod} (PAID)`, 5, y);
  y += 4;

  doc.line(5, y, 75, y);
  y += 4;

  // Footer notes
  doc.setFontSize(6.5);
  doc.text('Thank you for visiting us!', 40, y, { align: 'center' });
  y += 3;
  doc.text('Please visit again soon.', 40, y, { align: 'center' });

  return doc;
};

/**
 * Downloads the receipt PDF directly to the user's browser.
 */
export const downloadReceiptPdf = (order, store = {}, staff = null) => {
  const doc = generateReceiptPdf(order, store, staff);
  if (!doc) return;
  const orderNo = order._id ? order._id.slice(-6).toUpperCase() : 'RECEIPT';
  doc.save(`Receipt_${orderNo}.pdf`);
};

/**
 * Sends digital bill to WhatsApp:
 * 1. Generates the PDF file.
 * 2. Uses Web Share API (navigator.share) with the PDF file attached (on mobile / supported OS).
 * 3. Fallback: Automatically downloads the PDF and opens WhatsApp Web/API with complete text + online bill link.
 */
export const sendWhatsAppWithReceiptPdf = async ({
  order,
  store = {},
  staff = null,
  targetPhone = '',
  receiptUrl = ''
}) => {
  if (!order) return { success: false, message: 'No order provided' };

  const storeName = store.storeName || store.name || 'Our Store';
  const orderNo = order._id ? order._id.slice(-6).toUpperCase() : '';
  const filename = `Receipt_${orderNo || 'ORDER'}.pdf`;

  const cleanPhone = (targetPhone || order.customerPhone || '').replace(/[^0-9]/g, '');
  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // Build formatted text message
  let text = `🧾 *Digital Bill - ${storeName}*\n\n`;
  text += `*Receipt #:* ${orderNo}\n`;
  text += `*Date:* ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}\n`;
  if (order.tableNumber && order.tableNumber !== '0') {
    text += `*Table:* Table ${order.tableNumber} (Dine-in)\n`;
  }
  const billedBy = order.orderBy || (staff?.name ? `${staff.name}` : 'Counter');
  text += `*Billed by:* ${billedBy}\n\n`;
  text += `*Items:*\n`;
  (order.orderItems || []).forEach((item) => {
    text += `• ${item.name} x ${item.qty} = ₹${(item.price || 0) * (item.qty || 1)}\n`;
  });
  if (order.discountAmount > 0) {
    text += `\n*Discount:* -₹${order.discountAmount}\n`;
  }
  text += `\n*Total Amount:* ₹${order.totalAmount}\n`;
  text += `*Payment:* ${String(order.paymentMethod || 'cash').toUpperCase()} (PAID ✓)\n\n`;
  if (receiptUrl) {
    text += `📄 *Download / View Digital Receipt PDF:*\n${receiptUrl}\n\n`;
  }
  text += `Thank you for visiting ${storeName}! Visit us again soon.`;

  // Generate PDF doc
  const doc = generateReceiptPdf(order, store, staff);

  // Attempt Web Share API with attached PDF file
  let sharedDirectly = false;
  if (doc && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const blob = doc.output('blob');
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Receipt #${orderNo} - ${storeName}`,
          text: text
        });
        sharedDirectly = true;
        return {
          success: true,
          method: 'web_share',
          message: 'PDF receipt attached and shared via WhatsApp!'
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      console.warn('Web Share failed, falling back to download & WhatsApp Web:', err);
    }
  }

  // Fallback for Desktop / non-WebShare browsers:
  // 1. Download the PDF file directly
  if (doc) {
    doc.save(filename);
  }

  // 2. Open WhatsApp Web or wa.me with prefilled text
  const encoded = encodeURIComponent(text);
  const waUrl = phoneWithCountry
    ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(waUrl, '_blank');

  return {
    success: true,
    method: 'download_fallback',
    filename,
    message: `Receipt PDF "${filename}" downloaded! Attach it in the opened WhatsApp chat.`
  };
};
