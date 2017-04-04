define(['medid/creator', 'jquery', 'jspdf', 'medid/res'], function(Creator, $, jsPDF) {

	var MIDcard = {};
	MIDcard.drawCard = function (doc, x, y, barSize) {
		doc.setFillColor(200,0,0)
		doc.setDrawColor(0,0,0)
		doc.roundedRect(x,y,85.6,53.98,3,3,'F')
		doc.setFillColor(255,255,255)
		doc.setDrawColor(255,255,255)
		doc.roundedRect(x, y + barSize,85.6,38.98,3,3,'F')
		doc.rect(x, y + barSize,85.6,10,'F')
		doc.setDrawColor(0,0,0)
		doc.roundedRect(x,y,85.6,53.98,3,3,'S')
		}

	MIDcard.createPDF = function () {

		var fields = Creator.fields();
		var doc = new jsPDF();

		doc.setFont('helvetica');

		// Front side
		MIDcard.drawCard(doc, 10, 10, 15);

		//Labels
		doc.setFontSize(9);

		var image;
		var leftCounter = 0, rightCounter = 0;
		var leftStartPos = [12,55], rightStartPos = [38,30];
		var lineHeight = 5, leftLabelWidth = 19, rightLabelWidth = 21;
		for (i = 0; i < fields.length; i++) {
			if (fields[i].label == "Image") {
				image = fields[i].field;
			} else {
				fields[i].label = fields[i].label.substring(0, 13);
				fields[i].field = fields[i].field.substring(0, 19);
				if (fields[i].label == 'Donor' || fields[i].label == 'Blood type') {
					// We place the short fields 'donor' and 'blood type' in the corner
					if (leftCounter < 2) { // Max capacity
						doc.setFontStyle("bold");
						doc.text(leftStartPos[0], leftStartPos[1] + lineHeight * leftCounter, fields[i].label + ": ");
						doc.setFontStyle("normal");
						doc.text(leftStartPos[0] + leftLabelWidth, leftStartPos[1] + lineHeight * leftCounter, fields[i].field);
					}
					leftCounter++;
				}
				else {
					// Place remaining lines on the main part of the card
					if (rightCounter < 7) { // Max capacity
						doc.setFontStyle("bold");
						doc.text(rightStartPos[0], rightStartPos[1] + lineHeight * rightCounter, fields[i].label + ": ");
						doc.setFontStyle("normal");
						doc.text(rightStartPos[0] + rightLabelWidth, rightStartPos[1] + lineHeight * rightCounter, fields[i].field);
					}
					rightCounter++;
				}
			}
		}

		if (image) {
			doc.addImage(image , 13, 28, Creator.imageWidth/4.5, Creator.imageHeight/4.5);
		} else {
			doc.addImage(Resources.placeholder , 11, 26, 23, 23);
		}

		// Back side
		MIDcard.drawCard(doc, 100, 10, 15);
		doc.setFontStyle('normal');
		doc.text(110, 40, "This is an example card.");
		doc.text(110, 44, "The functional version of this card is reserved");
		doc.text(110, 48, "for registered users.");

		// Header bars
		doc.addImage(Resources.redLogo,'JPEG', 12,12,12,12);
		doc.setTextColor(255,255,255);
		doc.setFontSize(16);
		doc.text(25, 19.5, "MEDICAL INFORMATION");
		doc.setFontSize(14);
		doc.text(104, 19, "SCAN FOR MORE INFORMATION");

		return doc;
	}

	Creator.getMethod(function (callback) {
		callback(MIDcard.createPDF().output('datauristring')); //getDataUrl(callback);
	});
	Creator.downloadMethod(function (name) {
		MIDcard.createPDF().save(name);
	});
	Creator.saveEndpoint = '/save/card';
	Creator.init();

});
