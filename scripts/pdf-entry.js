import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';

const money = cents => '$' + (cents / 100).toFixed(2);
export async function downloadPDF(job, logoSvg) {
  const pdf = new jsPDF({unit:'mm',format:'a4'});
  pdf.setProperties({title:'RokaWright '+job.reference,author:'RokaWright'});
  pdf.setTextColor(80,52,67);
  pdf.setFont('times','italic'); pdf.setFontSize(29); pdf.text('RokaWright',18,25);
  if (logoSvg) {
    try {
      const image = new Image();
      image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(logoSvg);
      await image.decode();
      const canvas=document.createElement('canvas');canvas.width=180;canvas.height=180;
      canvas.getContext('2d').drawImage(image,0,0,180,180);
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',165,12,26,26);
    } catch { /* Keep the complete quote printable if the mark cannot render. */ }
  }
  pdf.setFont('helvetica','normal'); pdf.setFontSize(10);pdf.setTextColor(45,45,40);
  let y=39;
  const text=(value)=>{const rows=pdf.splitTextToSize(String(value),170);pdf.text(rows,18,y);y+=rows.length*5+2;};
  text(job.kind+' · '+job.reference);
  text('Customer: '+(job.customerName||'Quick quote'));
  text('Created: '+job.created+(job.due?'    Due: '+job.due:''));
  autoTable(pdf,{
    startY:y+3,margin:{left:18,right:18},
    head:[['Service','Qty','Unit price','Extra work (once)','Line total']],
    body:job.lines.map(l=>[
      l.name+(l.details?'\n'+l.details:'')+(l.extraNote?'\nExtra work: '+l.extraNote:''),
      String(l.quantity),money(l.cents),money(l.extraCents),money(l.cents*l.quantity+l.extraCents)
    ]),
    theme:'striped',headStyles:{fillColor:[65,75,54]},styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},
    columnStyles:{0:{cellWidth:70},1:{cellWidth:12},2:{cellWidth:25},3:{cellWidth:31},4:{cellWidth:36}}
  });
  y=pdf.lastAutoTable.finalY+12;
  if(y>245){pdf.addPage();y=22;}
  const total=job.lines.reduce((s,l)=>s+l.cents*l.quantity+l.extraCents,0);
  const paid=job.payments.reduce((s,p)=>s+p.cents,0);
  pdf.setFontSize(12);pdf.setFont('helvetica','bold');pdf.text('Total: '+money(total),192,y,{align:'right'});
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text('Amount paid: '+money(paid),192,y+8,{align:'right'});
  pdf.text((paid>total?'Overpayment: ':'Balance remaining: ')+money(Math.abs(total-paid)),192,y+16,{align:'right'});
  pdf.setFontSize(9);pdf.text('Customers supply materials. Thank you for trusting RokaWright.',18,y+30);
  const pages=pdf.getNumberOfPages();
  for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setFontSize(8);pdf.setTextColor(110);pdf.text('RokaWright · '+job.reference,18,286);pdf.text(n+' / '+pages,192,286,{align:'right'});}
  const blob=pdf.output('blob');
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
  a.download='RokaWright-'+job.reference.replace(/[^a-zA-Z0-9_-]/g,'')+'.pdf';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
