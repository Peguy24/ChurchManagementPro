import jsPDF from "jspdf";

interface Section {
  title: string;
  features: string[];
}

const getSections = (lang: string): Section[] => {
  const isFr = lang === "fr";
  return [
    {
      title: isFr ? "1. Gestion des Membres" : "1. Member Management",
      features: isFr
        ? [
            "Inscription et gestion complete des profils (informations personnelles, spirituelles, familiales)",
            "Numero de membre unique genere automatiquement",
            "Cartes de membre avec QR Code integre pour identification rapide",
            "Gestion des photos de profil avec recadrage intelligent",
            "Champs personnalises configurables (texte, nombre, date, liste deroulante, case a cocher)",
            "Importation en masse depuis fichier CSV/Excel",
            "Historique complet de chaque membre (presences, dons, evenements)",
            "Documents associes aux membres (certificats, diplomes, etc.)",
            "Filtrage et recherche avancee par statut, branche, ministere",
            "Exportation des donnees en CSV",
          ]
        : [
            "Complete profile management (personal, spiritual, family information)",
            "Auto-generated unique member numbers",
            "Member cards with integrated QR Code for quick identification",
            "Profile photo management with smart cropping",
            "Configurable custom fields (text, number, date, dropdown, checkbox)",
            "Bulk import from CSV/Excel files",
            "Complete member history (attendance, donations, events)",
            "Member-associated documents (certificates, diplomas, etc.)",
            "Advanced filtering and search by status, branch, ministry",
            "Data export to CSV",
          ],
    },
    {
      title: isFr ? "2. Gestion de la Presence" : "2. Attendance Management",
      features: isFr
        ? [
            "Marquage manuel de la presence avec liste des membres",
            "Scan de QR Code via camera pour enregistrement rapide",
            "Support de multiples types d'evenements (culte, etude biblique, priere, etc.)",
            "Alertes automatiques pour les membres absents (configurable : 2, 3, 4 semaines)",
            "Notifications par email aux pasteurs pour les absences prolongees",
            "Statistiques de presence par membre avec graphiques",
            "Comparaison de groupes et tendances de presence",
            "Rapports de presence exportables en PDF",
            "Historique complet de toutes les presences enregistrees",
          ]
        : [
            "Manual attendance marking with member list",
            "QR Code scanning via camera for quick check-in",
            "Support for multiple event types (worship, Bible study, prayer, etc.)",
            "Automatic alerts for absent members (configurable: 2, 3, 4 weeks)",
            "Email notifications to pastors for prolonged absences",
            "Per-member attendance statistics with charts",
            "Group comparison and attendance trends",
            "Exportable attendance reports in PDF",
            "Complete history of all recorded attendance",
          ],
    },
    {
      title: isFr ? "3. Gestion Financiere" : "3. Financial Management",
      features: isFr
        ? [
            "Enregistrement des dons et dimes avec categorisation (offrande, dime, don special, etc.)",
            "Gestion des depenses avec workflow d'approbation (en attente > approuve > rejete)",
            "Synchronisation automatique : chaque depense approuvee deduit le solde du compte bancaire ou de la caisse associee",
            "Gestion des comptes bancaires avec suivi du solde en temps reel",
            "Gestion des caisses (petite caisse) avec historique des transactions",
            "Budgets annuels par categorie avec suivi des depenses vs planifie",
            "Fonds speciaux (construction, mission, aide sociale) avec objectifs et progression",
            "Rapprochement bancaire : comparaison transactions systeme vs releves bancaires",
            "Paiement des salaires synchronise avec les depenses et les soldes",
            "Categories de revenus et de depenses personnalisables",
            "Piste d'audit complete de toutes les operations financieres",
            "Recus fiscaux generables en PDF pour les donateurs",
            "Support multi-devises (XOF, USD, EUR, etc.)",
          ]
        : [
            "Donation and tithe recording with categorization (offering, tithe, special gift, etc.)",
            "Expense management with approval workflow (pending > approved > rejected)",
            "Automatic synchronization: each approved expense deducts from associated bank account or cash register balance",
            "Bank account management with real-time balance tracking",
            "Cash register (petty cash) management with transaction history",
            "Annual budgets by category with expense vs planned tracking",
            "Special funds (construction, mission, social aid) with goals and progress",
            "Bank reconciliation: system transactions vs bank statement comparison",
            "Salary payments synchronized with expenses and balances",
            "Customizable income and expense categories",
            "Complete audit trail of all financial operations",
            "Tax receipts generatable as PDF for donors",
            "Multi-currency support (XOF, USD, EUR, etc.)",
          ],
    },
    {
      title: isFr ? "4. Evenements et Ministeres" : "4. Events & Ministries",
      features: isFr
        ? [
            "Planification d'evenements avec date, heure, lieu et description",
            "Estimation du nombre de participants attendus",
            "Rappels automatiques par email avant les evenements",
            "Gestion des ministeres (louange, jeunesse, enfants, intercession, etc.)",
            "Affectation d'un responsable par ministere",
            "Association des membres aux ministeres",
            "Statistiques de participation par ministere",
            "Filtrage par branche pour les evenements multi-sites",
          ]
        : [
            "Event planning with date, time, location and description",
            "Expected attendee count estimation",
            "Automatic email reminders before events",
            "Ministry management (worship, youth, children, intercession, etc.)",
            "Ministry leader assignment",
            "Member-to-ministry association",
            "Per-ministry participation statistics",
            "Branch filtering for multi-site events",
          ],
    },
    {
      title: isFr ? "5. Gestion Multi-Branches" : "5. Multi-Branch Management",
      features: isFr
        ? [
            "Support de multiples branches/sites d'une meme eglise",
            "Hierarchie de branches (branche principale et sous-branches)",
            "Affectation des membres, evenements et finances par branche",
            "Responsable designe par branche",
            "Rapports consolides ou filtres par branche",
            "Gestion des ressources partagees entre branches",
          ]
        : [
            "Support for multiple branches/sites of the same church",
            "Branch hierarchy (main branch and sub-branches)",
            "Member, event and finance assignment by branch",
            "Designated branch leaders",
            "Consolidated or branch-filtered reports",
            "Shared resource management across branches",
          ],
    },
    {
      title: isFr ? "6. Rapports et Tableaux de Bord" : "6. Reports & Dashboards",
      features: isFr
        ? [
            "Tableau de bord principal avec vue d'ensemble (membres, presences, finances)",
            "Tableau de bord financier detaille avec graphiques de revenus vs depenses",
            "Rapports financiers complets (par periode, categorie, membre)",
            "Rapports de presence avec tendances et comparaisons",
            "Rapport des anniversaires pour suivi pastoral",
            "Rapports d'inventaire avec valeur totale des actifs",
            "Exportation en PDF et CSV de tous les rapports",
            "Comparaison de groupes (branches, ministeres) avec graphiques",
          ]
        : [
            "Main dashboard with overview (members, attendance, finances)",
            "Detailed financial dashboard with revenue vs expense charts",
            "Complete financial reports (by period, category, member)",
            "Attendance reports with trends and comparisons",
            "Birthday reports for pastoral follow-up",
            "Inventory reports with total asset value",
            "PDF and CSV export for all reports",
            "Group comparison (branches, ministries) with charts",
          ],
    },
    {
      title: isFr ? "7. Gestion de l'Inventaire" : "7. Inventory Management",
      features: isFr
        ? [
            "Suivi des biens et equipements de l'eglise (mobilier, instruments, equipements audio/video)",
            "Code-barres et numeros de serie pour identification unique",
            "Photos des articles avec upload integre",
            "Suivi de l'etat et de la valeur des actifs",
            "Historique de maintenance avec planification des prochaines interventions",
            "Mode audit pour verification physique de l'inventaire",
            "Alertes de stock minimum pour les consommables",
            "Rapport d'inventaire complet exportable en PDF",
          ]
        : [
            "Church asset and equipment tracking (furniture, instruments, audio/video equipment)",
            "Barcodes and serial numbers for unique identification",
            "Item photos with integrated upload",
            "Asset condition and value tracking",
            "Maintenance history with next service scheduling",
            "Audit mode for physical inventory verification",
            "Minimum stock alerts for consumables",
            "Complete inventory report exportable as PDF",
          ],
    },
    {
      title: "8. Communication",
      features: isFr
        ? [
            "Modeles d'emails personnalisables (bienvenue, anniversaire, rappel d'evenement)",
            "Alertes automatiques d'absence envoyees aux responsables",
            "Notifications d'anniversaire pour le suivi pastoral",
            "Emails d'invitation pour les administrateurs",
            "Notifications lors de l'approbation/rejet des depenses",
          ]
        : [
            "Customizable email templates (welcome, birthday, event reminder)",
            "Automatic absence alerts sent to leaders",
            "Birthday notifications for pastoral care",
            "Admin invitation emails",
            "Expense approval/rejection notifications",
          ],
    },
    {
      title: isFr ? "9. Analyses Intelligentes (IA)" : "9. Smart Insights (AI)",
      features: isFr
        ? [
            "Scores d'engagement calcules automatiquement pour chaque membre",
            "Prediction du risque de decrochage (churn) basee sur les tendances",
            "Alertes pastorales generees par l'IA pour les membres a risque",
            "Analyse des tendances de presence et de generosite",
            "Recommandations d'actions pour ameliorer l'engagement",
            "Tableau de bord des insights avec visualisations interactives",
          ]
        : [
            "Automatically calculated engagement scores for each member",
            "Churn risk prediction based on trends",
            "AI-generated pastoral alerts for at-risk members",
            "Attendance and giving trend analysis",
            "Action recommendations to improve engagement",
            "Insights dashboard with interactive visualizations",
          ],
    },
    {
      title: isFr ? "10. Parametres et Configuration" : "10. Settings & Configuration",
      features: isFr
        ? [
            "Informations de l'eglise (nom, adresse, logo, coordonnees)",
            "Selection de la devise (XOF, USD, EUR, GBP, etc.)",
            "Champs personnalises pour adapter le systeme a vos besoins",
            "Gestion des utilisateurs avec roles et permissions",
            "Personnalisation de la marque (logo, nom de l'application, couleurs)",
            "Plans d'abonnement : Essentiel, Professionnel, Entreprise",
          ]
        : [
            "Church information (name, address, logo, contact details)",
            "Currency selection (XOF, USD, EUR, GBP, etc.)",
            "Custom fields to adapt the system to your needs",
            "User management with roles and permissions",
            "Brand customization (logo, app name, colors)",
            "Subscription plans: Essential, Professional, Enterprise",
          ],
    },
    {
      title: isFr ? "11. Securite et Controle d'Acces" : "11. Security & Access Control",
      features: isFr
        ? [
            "Authentification securisee par email et mot de passe",
            "Roles predefinis : Administrateur, Pasteur, Tresorier, Secretaire, Benevole",
            "Permissions granulaires par module (membres, finances, presences, etc.)",
            "Isolation complete des donnees entre les eglises (multi-tenant)",
            "Piste d'audit pour tracer toutes les actions sensibles",
            "Workflow d'approbation pour les depenses et les nouveaux utilisateurs",
            "Chiffrement des donnees en transit et au repos",
          ]
        : [
            "Secure email and password authentication",
            "Predefined roles: Administrator, Pastor, Treasurer, Secretary, Volunteer",
            "Granular permissions per module (members, finances, attendance, etc.)",
            "Complete data isolation between churches (multi-tenant)",
            "Audit trail to track all sensitive actions",
            "Approval workflow for expenses and new users",
            "Data encryption in transit and at rest",
          ],
    },
  ];
};

export function generateSystemGuidePDF(lang: string = "fr") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const isFr = lang === "fr";

  let y = 0;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      addPage();
      return true;
    }
    return false;
  };

  const addFooter = (pageNum: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Church Manager Pro -- ${isFr ? "Guide du Systeme" : "System Guide"}`, margin, pageHeight - 10);
    doc.text(`${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  // ── Cover Page ──
  doc.setFillColor(30, 58, 138); // deep blue
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Accent bar
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight * 0.45, pageWidth, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("Church Manager Pro", pageWidth / 2, pageHeight * 0.3, { align: "center" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.text(
    isFr ? "Guide Complet du Systeme" : "Complete System Guide",
    pageWidth / 2,
    pageHeight * 0.38,
    { align: "center" }
  );

  doc.setFontSize(14);
  doc.text(
    isFr
      ? "Plateforme de Gestion d'Eglise"
      : "Church Management Platform",
    pageWidth / 2,
    pageHeight * 0.55,
    { align: "center" }
  );

  doc.setFontSize(11);
  doc.text(
    isFr
      ? "Membres - Finances - Presences - Evenements - Inventaire - Rapports - IA"
      : "Members - Finances - Attendance - Events - Inventory - Reports - AI",
    pageWidth / 2,
    pageHeight * 0.62,
    { align: "center" }
  );

  const today = new Date().toLocaleDateString(isFr ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(10);
  doc.text(today, pageWidth / 2, pageHeight * 0.85, { align: "center" });
  doc.text(
    isFr ? "Document confidentiel" : "Confidential Document",
    pageWidth / 2,
    pageHeight * 0.89,
    { align: "center" }
  );

  addFooter(1);

  // ── Table of Contents ──
  addPage();
  let pageNum = 2;

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "Table des Matieres" : "Table of Contents", margin, y + 10);
  y += 25;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const sections = getSections(lang);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  sections.forEach((section, idx) => {
    doc.text(`${section.title}`, margin + 5, y);
    y += 8;
  });

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    isFr
      ? "Ce document presente l'ensemble des fonctionnalites de la plateforme Church Manager Pro."
      : "This document presents all features of the Church Manager Pro platform.",
    margin,
    y
  );

  addFooter(pageNum);

  // ── Content Sections ──
  sections.forEach((section) => {
    addPage();
    pageNum++;

    // Section header with colored bar
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, y, contentWidth, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin + 5, y + 9);
    y += 20;

    // Features
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    section.features.forEach((feature) => {
      const lines = doc.splitTextToSize(`•  ${feature}`, contentWidth - 10);
      const lineHeight = 5.5;
      const blockHeight = lines.length * lineHeight + 3;

      checkPageBreak(blockHeight);

      lines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 5, y);
        y += lineHeight;
      });
      y += 2;
    });

    addFooter(pageNum);
  });

  // ── Summary Page ──
  addPage();
  pageNum++;

  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, contentWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(isFr ? "Resume" : "Summary", margin + 5, y + 9);
  y += 25;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const summaryItems = isFr
    ? [
        "- Gestion complete des membres avec QR Code et champs personnalises",
        "- Suivi de la presence avec scan et alertes automatiques",
        "- Gestion financiere integree avec synchronisation automatique des soldes",
        "- Workflow d'approbation des depenses et paiement des salaires",
        "- Gestion multi-branches avec donnees isolees",
        "- Rapports detailles exportables en PDF et CSV",
        "- Inventaire des biens avec maintenance et code-barres",
        "- Communication automatisee (emails, alertes, notifications)",
        "- Analyses intelligentes par IA (engagement, risque de decrochage)",
        "- Securite renforcee avec roles, permissions et audit",
        "- Personnalisation de la marque (white-label)",
        "- Support multi-devises et multilingue (Francais/Anglais)",
      ]
    : [
        "- Complete member management with QR Code and custom fields",
        "- Attendance tracking with scanning and automatic alerts",
        "- Integrated financial management with automatic balance synchronization",
        "- Expense approval workflow and salary payments",
        "- Multi-branch management with isolated data",
        "- Detailed reports exportable as PDF and CSV",
        "- Asset inventory with maintenance and barcodes",
        "- Automated communication (emails, alerts, notifications)",
        "- AI-powered smart insights (engagement, churn risk)",
        "- Enhanced security with roles, permissions and audit",
        "- Brand customization (white-label)",
        "- Multi-currency and multilingual support (French/English)",
      ];

  summaryItems.forEach((item) => {
    checkPageBreak(8);
    doc.text(item, margin + 5, y);
    y += 8;
  });

  y += 15;
  checkPageBreak(20);
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(
    isFr ? "Church Manager Pro -- Votre eglise, simplifiee." : "Church Manager Pro -- Your church, simplified.",
    pageWidth / 2,
    y + 12,
    { align: "center" }
  );

  addFooter(pageNum);

  doc.save(isFr ? "Guide_Church_Manager_Pro.pdf" : "Church_Manager_Pro_Guide.pdf");
}
