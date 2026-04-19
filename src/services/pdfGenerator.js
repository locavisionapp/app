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

/**
 * GÉNÉRATEUR DE CONTRAT DE LOCATION FORMEL
 */
export const generateRentalContractPDF = async (rentalData, vehicleData, clientData) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    const addText = (text, x, y, fontSize = 10, isBold = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.text(text, x, y);
    };

    // Header Pro
    pdf.setFillColor(15, 23, 42); // Deep Slate
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    addText('CONTRAT DE LOCATION DE VÉHICULE', pageWidth / 2, 18, 16, true);
    pdf.setFontSize(8);
    pdf.text(`RÉFÉRENCE : ${rentalData.id || 'LOC-' + Date.now()}`, pageWidth / 2, 25, { align: 'center' });
    pdf.text('LocaVision Enterprise Edition - Signature Électronique Certifiée', pageWidth / 2, 32, { align: 'center' });

    pdf.setTextColor(0, 0, 0);
    let y = 55;

    // 1. LES PARTIES
    addText('1. LES PARTIES', margin, y, 12, true);
    y += 8;
    addText(`Loueur : LocaVision Pro Fleet Services`, margin, y);
    addText(`Locataire : ${clientData.name}`, pageWidth / 2, y);
    y += 6;
    addText(`Email : contact@locavision.pro`, margin, y);
    addText(`Email : ${clientData.email}`, pageWidth / 2, y);
    y += 6;
    addText(`Tél : +33 (0)1 23 45 67 89`, margin, y);
    addText(`Permis : ${clientData.licenseNumber || 'N/A'}`, pageWidth / 2, y);

    y += 15;

    // 2. LE VÉHICULE
    addText('2. DÉSIGNATION DU VÉHICULE', margin, y, 12, true);
    y += 8;
    addText(`Véhicule : ${vehicleData.brand} ${vehicleData.model}`, margin, y);
    addText(`Immatriculation : ${vehicleData.licensePlate}`, pageWidth / 2, y);
    y += 6;
    addText(`Catégorie : ${vehicleData.category}`, margin, y);
    addText(`Kilométrage départ : ${rentalData.startMileage || vehicleData.mileage || 0} km`, pageWidth / 2, y);
    y += 6;
    addText(`État au départ : ${rentalData.conditionNotes || 'Conforme à l\'expertise'}`, margin, y);
    
    y += 12;

    // 3. CONDITIONS FINANCIÈRES
    addText('3. CONDITIONS FINANCIÈRES', margin, y, 12, true);
    y += 8;
    addText(`Mode de paiement : ${rentalData.paymentMethod || 'Carte Bancaire'}`, margin, y);
    addText(`Dépôt de garantie (Caution) : ${rentalData.depositAmount || 0},00 €`, pageWidth / 2, y);
    y += 6;
    addText(`Détails : ${rentalData.startDate} au ${rentalData.endDate}`, margin, y);
    addText(`TOTAL LOCATION : ${rentalData.totalPrice || 0},00 € TTC`, pageWidth / 2, y);

    y += 15;

    // 4. CONDITIONS & CLAUSES
    addText('4. CONDITIONS GÉNÉRALES DE LOCATION (EXTRAIT)', margin, y, 12, true);
    y += 8;
    pdf.setFontSize(7);
    const clauses = [
      "• État du véhicule : Le locataire reconnaît avoir reçu le véhicule en parfait état de marche et de carrosserie, sous réserve des dommages listés dans l'expertise jointe.",
      "• Assurances : Le véhicule est assuré en 'Tous Risques' avec une franchise de 1500€. En cas de sinistre responsable ou sans tiers identifié, la franchise restera à charge.",
      "• Carburant : Le véhicule doit être restitué avec le même niveau de carburant qu'au départ. À défaut, un forfait de mise à niveau sera facturé.",
      "• Usage : Le locataire s'engage à ne pas utiliser le véhicule pour le transport de marchandises onéreuses ou pour des compétitions sportives.",
      "• Restitution : Toute restitution tardive donnera lieu à une facturation complémentaire fixée au tarif journalier majoré de 25%."
    ];
    clauses.forEach(cl => {
      const splitCl = pdf.splitTextToSize(cl, pageWidth - 40);
      pdf.text(splitCl, margin, y);
      y += 4 * splitCl.length + 2;
    });

    y += 10;

    // 4. SIGNATURES
    if (y > pageHeight - 60) { pdf.addPage(); y = 30; }
    addText('4. ACCEPTATION ET SIGNATURES', margin, y, 12, true);
    y += 10;

    const signatureWidth = 60;
    const signatureHeight = 25;

    // Agent Signature
    const agentSig = rentalData.signatures?.find(s => s.type === 'agent');
    if (agentSig) {
      addText('L\'Agent (LocaVision)', margin, y, 9, true);
      const img = new Image();
      img.src = agentSig.data;
      await new Promise((resolve) => {
        img.onload = () => {
          pdf.addImage(img, 'PNG', margin, y + 2, signatureWidth, signatureHeight);
          resolve();
        };
        img.onerror = resolve;
      });
    }

    // Client Signature
    const clientSig = rentalData.signatures?.find(s => s.type === 'client');
    if (clientSig) {
      addText('Le Locataire (Bon pour accord)', pageWidth / 2, y, 9, true);
      const img = new Image();
      img.src = clientSig.data;
      await new Promise((resolve) => {
        img.onload = () => {
          pdf.addImage(img, 'PNG', pageWidth / 2, y + 2, signatureWidth, signatureHeight);
          resolve();
        };
        img.onerror = resolve;
      });
    }

    y += 35;
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(`Fait à Paris, le ${new Date().toLocaleDateString('fr-FR')}`, margin, y);
    pdf.text("Ce document est certifié par la blockchain LocaVision et possède une valeur juridique probante.", margin, y + 4);

    return pdf;
  } catch (error) {
    console.error('Error generating contract PDF:', error);
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
