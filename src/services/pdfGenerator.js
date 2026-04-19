import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateInspectionPDF = async (inspectionData, vehicleData, clientData) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Helper function to add text with proper formatting
    const addText = (text, x, y, fontSize = 12, isBold = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.text(text, x, y);
    };
    
    // Header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    addText('RAPPORT D\'INSPECTION VÉHICULE', pageWidth / 2, 15, 16, true);
    addText('LocaVision - Inspection IA', pageWidth / 2, 22, 10, false);
    pdf.textAlign = 'center';
    
    pdf.setTextColor(0, 0, 0);
    
    let currentY = 45;
    
    // Vehicle Information
    addText('INFORMATIONS VÉHICULE', 20, currentY, 14, true);
    currentY += 10;
    
    pdf.setFontSize(10);
    pdf.text(`Marque/Modèle: ${vehicleData.brand || 'N/A'} ${vehicleData.model || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Immatriculation: ${vehicleData.licensePlate || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`VIN: ${vehicleData.vin || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Catégorie: ${vehicleData.category || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Kilométrage: ${vehicleData.mileage?.toLocaleString() || 'N/A'} km`, 20, currentY);
    currentY += 6;
    pdf.text(`Statut: ${vehicleData.status || 'N/A'}`, 20, currentY);
    
    currentY += 15;
    
    // Client Information
    addText('INFORMATIONS CLIENT', 20, currentY, 14, true);
    currentY += 10;
    
    pdf.setFontSize(10);
    pdf.text(`Nom: ${clientData.name || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Email: ${clientData.email || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Téléphone: ${clientData.phone || 'N/A'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Permis: ${clientData.licenseNumber || 'N/A'}`, 20, currentY);
    
    currentY += 15;
    
    // Inspection Information
    addText('DÉTAILS INSPECTION', 20, currentY, 14, true);
    currentY += 10;
    
    pdf.setFontSize(10);
    pdf.text(`Type: ${inspectionData.type === 'checkout' ? 'Check-out (Départ)' : 'Check-in (Retour)'}`, 20, currentY);
    currentY += 6;
    pdf.text(`Date: ${new Date(inspectionData.createdAt).toLocaleString('fr-FR')}`, 20, currentY);
    currentY += 6;
    pdf.text(`Agent: ${inspectionData.agentName || 'N/A'}`, 20, currentY);
    currentY += 6;
    
    if (inspectionData.coordinates) {
      pdf.text(`GPS: ${inspectionData.coordinates.latitude?.toFixed(6)}, ${inspectionData.coordinates.longitude?.toFixed(6)}`, 20, currentY);
      currentY += 6;
    }
    
    currentY += 15;
    
    // AI Analysis Results
    if (inspectionData.aiAnalysis) {
      addText('ANALYSE IA', 20, currentY, 14, true);
      currentY += 10;
      
      pdf.setFontSize(10);
      pdf.text(`Score Global: ${inspectionData.aiAnalysis.overall_condition || 'N/A'}/10`, 20, currentY);
      currentY += 6;
      pdf.text(`Confiance: ${((inspectionData.aiAnalysis.confidence || 0) * 100).toFixed(1)}%`, 20, currentY);
      currentY += 6;
      pdf.text(`Nombre de dommages: ${inspectionData.aiAnalysis.damages?.length || 0}`, 20, currentY);
      
      if (inspectionData.aiAnalysis.damages && inspectionData.aiAnalysis.damages.length > 0) {
        currentY += 10;
        addText('DOMMAGES DÉTECTÉS:', 20, currentY, 12, true);
        currentY += 8;
        
        inspectionData.aiAnalysis.damages.forEach((damage, index) => {
          if (currentY > pageHeight - 40) {
            pdf.addPage();
            currentY = 20;
          }
          
          pdf.setFontSize(9);
          pdf.text(`${index + 1}. ${damage.type || 'N/A'} - ${damage.location || 'N/A'}`, 25, currentY);
          currentY += 5;
          pdf.text(`   Sévérité: ${damage.severity || 'N/A'}/5`, 25, currentY);
          currentY += 5;
          pdf.text(`   Description: ${damage.description || 'N/A'}`, 25, currentY);
          currentY += 5;
          
          if (damage.estimated_cost) {
            pdf.text(`   Coût estimé: ${damage.estimated_cost}€`, 25, currentY);
            currentY += 5;
          }
          currentY += 3;
        });
      }
    }
    
    // Add images if available
    if (inspectionData.images && inspectionData.images.length > 0) {
      pdf.addPage();
      currentY = 20;
      
      addText('PHOTOS D\'INSPECTION', pageWidth / 2, currentY, 14, true);
      currentY += 20;
      
      for (let i = 0; i < inspectionData.images.length; i++) {
        const image = inspectionData.images[i];
        
        if (currentY > pageHeight - 80) {
          pdf.addPage();
          currentY = 20;
        }
        
        try {
          // Add image title
          pdf.setFontSize(10);
          pdf.text(`${i + 1}. ${image.name || 'Point ' + (i + 1)}`, 20, currentY);
          currentY += 5;
          
          // Add image
          const img = new Image();
          img.src = image.image;
          
          await new Promise((resolve) => {
            img.onload = () => {
              const imgWidth = 60;
              const imgHeight = (img.height * imgWidth) / img.width;
              
              pdf.addImage(img, 'JPEG', 20, currentY, imgWidth, Math.min(imgHeight, 50));
              currentY += Math.min(imgHeight, 50) + 10;
              resolve();
            };
            img.onerror = resolve;
          });
          
          // Add timestamp
          pdf.setFontSize(8);
          pdf.text(`Date: ${new Date(image.timestamp).toLocaleString('fr-FR')}`, 20, currentY);
          currentY += 15;
          
        } catch (error) {
          console.error('Error adding image to PDF:', error);
          pdf.text(`Erreur lors de l'ajout de l'image ${i + 1}`, 20, currentY);
          currentY += 15;
        }
      }
    }
    
    // Signatures
    if (inspectionData.signatures && inspectionData.signatures.length > 0) {
      pdf.addPage();
      currentY = 20;
      
      addText('SIGNATURES', pageWidth / 2, currentY, 14, true);
      currentY += 20;
      
      for (const signature of inspectionData.signatures) {
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = 20;
        }
        
        pdf.setFontSize(10);
        pdf.text(`${signature.type === 'agent' ? 'Agent' : 'Client'}:`, 20, currentY);
        currentY += 5;
        
        try {
          const img = new Image();
          img.src = signature.data;
          
          await new Promise((resolve) => {
            img.onload = () => {
              pdf.addImage(img, 'PNG', 20, currentY, 60, 30);
              currentY += 35;
              resolve();
            };
            img.onerror = resolve;
          });
          
          pdf.text(`Date: ${new Date(signature.timestamp).toLocaleString('fr-FR')}`, 20, currentY);
          currentY += 15;
          
        } catch (error) {
          console.error('Error adding signature to PDF:', error);
          currentY += 20;
        }
      }
    }
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 10);
      pdf.text('Généré par LocaVision - ' + new Date().toLocaleString('fr-FR'), pageWidth / 2, pageHeight - 5);
    }
    
    return pdf;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generateComparisonPDF = async (checkoutData, checkinData, comparisonResult) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header
    pdf.setFillColor(239, 68, 68); // Red for comparison
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT COMPARATIF AVANT/APRÈS', pageWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('LocaVision - Détection de nouveaux dommages', pageWidth / 2, 22, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    
    let currentY = 45;
    
    // Comparison Summary
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RÉSUMÉ COMPARAISON', 20, currentY);
    currentY += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nouveaux dommages détectés: ${comparisonResult.new_damages?.length || 0}`, 20, currentY);
    currentY += 6;
    pdf.text(`Coût total des nouveaux dommages: ${comparisonResult.total_new_cost || 0}€`, 20, currentY);
    currentY += 6;
    pdf.text(`Confiance de la comparaison: ${((comparisonResult.comparison_confidence || 0) * 100).toFixed(1)}%`, 20, currentY);
    
    currentY += 15;
    
    // New damages details
    if (comparisonResult.new_damages && comparisonResult.new_damages.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NOUVEAUX DOMMAGES:', 20, currentY);
      currentY += 10;
      
      comparisonResult.new_damages.forEach((damage, index) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}. ${damage.type?.toUpperCase() || 'N/A'} - ${damage.location || 'N/A'}`, 20, currentY);
        currentY += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`   Sévérité: ${damage.severity || 'N/A'}/5`, 25, currentY);
        currentY += 5;
        pdf.text(`   Description: ${damage.description || 'N/A'}`, 25, currentY);
        currentY += 5;
        pdf.text(`   Coût estimé: ${damage.estimated_cost || 0}€`, 25, currentY);
        currentY += 8;
      });
    } else {
      pdf.setFontSize(10);
      pdf.text('Aucun nouveau dommage détecté', 20, currentY);
    }
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Page ${i} / ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    return pdf;
    
  } catch (error) {
    console.error('Error generating comparison PDF:', error);
    throw error;
  }
};
