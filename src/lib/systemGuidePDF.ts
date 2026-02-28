import jsPDF from "jspdf";

interface Section {
  title: string;
  icon: string;
  features: string[];
}

const getSections = (lang: string): Section[] => {
  const isFr = lang === "fr";
  return [
    {
      title: isFr ? "1. Gestion des Membres" : "1. Member Management",
      icon: "👥",
      features: isFr
        ? [
            "Inscription et gestion complète des profils (informations personnelles, spirituelles, familiales)",
            "Numéro de membre unique généré automatiquement",
            "Cartes de membre avec QR Code intégré pour identification rapide",
            "Gestion des photos de profil avec recadrage intelligent",
            "Champs personnalisés configurables (texte, nombre, date, liste déroulante, case à cocher)",
            "Importation en masse depuis fichier CSV/Excel",
            "Historique complet de chaque membre (présences, dons, événements)",
            "Documents associés aux membres (certificats, diplômes, etc.)",
            "Filtrage et recherche avancée par statut, branche, ministère",
            "Exportation des données en CSV",
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
      title: isFr ? "2. Gestion de la Présence" : "2. Attendance Management",
      icon: "✅",
      features: isFr
        ? [
            "Marquage manuel de la présence avec liste des membres",
            "Scan de QR Code via caméra pour enregistrement rapide",
            "Support de multiples types d'événements (culte, étude biblique, prière, etc.)",
            "Alertes automatiques pour les membres absents (configurable : 2, 3, 4 semaines)",
            "Notifications par email aux pasteurs pour les absences prolongées",
            "Statistiques de présence par membre avec graphiques",
            "Comparaison de groupes et tendances de présence",
            "Rapports de présence exportables en PDF",
            "Historique complet de toutes les présences enregistrées",
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
      title: isFr ? "3. Gestion Financière" : "3. Financial Management",
      icon: "💰",
      features: isFr
        ? [
            "Enregistrement des dons et dîmes avec catégorisation (offrande, dîme, don spécial, etc.)",
            "Gestion des dépenses avec workflow d'approbation (en attente → approuvé → rejeté)",
            "Synchronisation automatique : chaque dépense approuvée déduit le solde du compte bancaire ou de la caisse associée",
            "Gestion des comptes bancaires avec suivi du solde en temps réel",
            "Gestion des caisses (petite caisse) avec historique des transactions",
            "Budgets annuels par catégorie avec suivi des dépenses vs planifié",
            "Fonds spéciaux (construction, mission, aide sociale) avec objectifs et progression",
            "Rapprochement bancaire : comparaison transactions système vs relevés bancaires",
            "Paiement des salaires synchronisé avec les dépenses et les soldes",
            "Catégories de revenus et de dépenses personnalisables",
            "Piste d'audit complète de toutes les opérations financières",
            "Reçus fiscaux générables en PDF pour les donateurs",
            "Support multi-devises (XOF, USD, EUR, etc.)",
          ]
        : [
            "Donation and tithe recording with categorization (offering, tithe, special gift, etc.)",
            "Expense management with approval workflow (pending → approved → rejected)",
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
      title: isFr ? "4. Événements et Ministères" : "4. Events & Ministries",
      icon: "📅",
      features: isFr
        ? [
            "Planification d'événements avec date, heure, lieu et description",
            "Estimation du nombre de participants attendus",
            "Rappels automatiques par email avant les événements",
            "Gestion des ministères (louange, jeunesse, enfants, intercession, etc.)",
            "Affectation d'un responsable par ministère",
            "Association des membres aux ministères",
            "Statistiques de participation par ministère",
            "Filtrage par branche pour les événements multi-sites",
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
      icon: "🏛️",
      features: isFr
        ? [
            "Support de multiples branches/sites d'une même église",
            "Hiérarchie de branches (branche principale et sous-branches)",
            "Affectation des membres, événements et finances par branche",
            "Responsable désigné par branche",
            "Rapports consolidés ou filtrés par branche",
            "Gestion des ressources partagées entre branches",
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
      icon: "📊",
      features: isFr
        ? [
            "Tableau de bord principal avec vue d'ensemble (membres, présences, finances)",
            "Tableau de bord financier détaillé avec graphiques de revenus vs dépenses",
            "Rapports financiers complets (par période, catégorie, membre)",
            "Rapports de présence avec tendances et comparaisons",
            "Rapport des anniversaires pour suivi pastoral",
            "Rapports d'inventaire avec valeur totale des actifs",
            "Exportation en PDF et CSV de tous les rapports",
            "Comparaison de groupes (branches, ministères) avec graphiques",
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
      icon: "📦",
      features: isFr
        ? [
            "Suivi des biens et équipements de l'église (mobilier, instruments, équipements audio/vidéo)",
            "Code-barres et numéros de série pour identification unique",
            "Photos des articles avec upload intégré",
            "Suivi de l'état et de la valeur des actifs",
            "Historique de maintenance avec planification des prochaines interventions",
            "Mode audit pour vérification physique de l'inventaire",
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
      title: isFr ? "8. Communication" : "8. Communication",
      icon: "📧",
      features: isFr
        ? [
            "Modèles d'emails personnalisables (bienvenue, anniversaire, rappel d'événement)",
            "Alertes automatiques d'absence envoyées aux responsables",
            "Notifications d'anniversaire pour le suivi pastoral",
            "Emails d'invitation pour les administrateurs",
            "Notifications lors de l'approbation/rejet des dépenses",
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
      icon: "🤖",
      features: isFr
        ? [
            "Scores d'engagement calculés automatiquement pour chaque membre",
            "Prédiction du risque de décrochage (churn) basée sur les tendances",
            "Alertes pastorales générées par l'IA pour les membres à risque",
            "Analyse des tendances de présence et de générosité",
            "Recommandations d'actions pour améliorer l'engagement",
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
      title: isFr ? "10. Paramètres et Configuration" : "10. Settings & Configuration",
      icon: "⚙️",
      features: isFr
        ? [
            "Informations de l'église (nom, adresse, logo, coordonnées)",
            "Sélection de la devise (XOF, USD, EUR, GBP, etc.)",
            "Champs personnalisés pour adapter le système à vos besoins",
            "Gestion des utilisateurs avec rôles et permissions",
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
      title: isFr ? "11. Sécurité et Contrôle d'Accès" : "11. Security & Access Control",
      icon: "🔒",
      features: isFr
        ? [
            "Authentification sécurisée par email et mot de passe",
            "Rôles prédéfinis : Administrateur, Pasteur, Trésorier, Secrétaire, Bénévole",
            "Permissions granulaires par module (membres, finances, présences, etc.)",
            "Isolation complète des données entre les églises (multi-tenant)",
            "Piste d'audit pour tracer toutes les actions sensibles",
            "Workflow d'approbation pour les dépenses et les nouveaux utilisateurs",
            "Chiffrement des données en transit et au repos",
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
    doc.text(`Church Manager Pro — ${isFr ? "Guide du Système" : "System Guide"}`, margin, pageHeight - 10);
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
    isFr ? "Guide Complet du Système" : "Complete System Guide",
    pageWidth / 2,
    pageHeight * 0.38,
    { align: "center" }
  );

  doc.setFontSize(14);
  doc.text(
    isFr
      ? "Plateforme de Gestion d'Église"
      : "Church Management Platform",
    pageWidth / 2,
    pageHeight * 0.55,
    { align: "center" }
  );

  doc.setFontSize(11);
  doc.text(
    isFr
      ? "Membres • Finances • Présences • Événements • Inventaire • Rapports • IA"
      : "Members • Finances • Attendance • Events • Inventory • Reports • AI",
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
  doc.text(isFr ? "Table des Matières" : "Table of Contents", margin, y + 10);
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
    doc.text(`${section.icon}  ${section.title}`, margin + 5, y);
    y += 8;
  });

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    isFr
      ? "Ce document présente l'ensemble des fonctionnalités de la plateforme Church Manager Pro."
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
    doc.text(`${section.icon}  ${section.title}`, margin + 5, y + 9);
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
  doc.text(isFr ? "📋  Résumé" : "📋  Summary", margin + 5, y + 9);
  y += 25;

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const summaryItems = isFr
    ? [
        "✅ Gestion complète des membres avec QR Code et champs personnalisés",
        "✅ Suivi de la présence avec scan et alertes automatiques",
        "✅ Gestion financière intégrée avec synchronisation automatique des soldes",
        "✅ Workflow d'approbation des dépenses et paiement des salaires",
        "✅ Gestion multi-branches avec données isolées",
        "✅ Rapports détaillés exportables en PDF et CSV",
        "✅ Inventaire des biens avec maintenance et code-barres",
        "✅ Communication automatisée (emails, alertes, notifications)",
        "✅ Analyses intelligentes par IA (engagement, risque de décrochage)",
        "✅ Sécurité renforcée avec rôles, permissions et audit",
        "✅ Personnalisation de la marque (white-label)",
        "✅ Support multi-devises et multilingue (Français/Anglais)",
      ]
    : [
        "✅ Complete member management with QR Code and custom fields",
        "✅ Attendance tracking with scanning and automatic alerts",
        "✅ Integrated financial management with automatic balance synchronization",
        "✅ Expense approval workflow and salary payments",
        "✅ Multi-branch management with isolated data",
        "✅ Detailed reports exportable as PDF and CSV",
        "✅ Asset inventory with maintenance and barcodes",
        "✅ Automated communication (emails, alerts, notifications)",
        "✅ AI-powered smart insights (engagement, churn risk)",
        "✅ Enhanced security with roles, permissions and audit",
        "✅ Brand customization (white-label)",
        "✅ Multi-currency and multilingual support (French/English)",
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
    isFr ? "Church Manager Pro — Votre église, simplifiée." : "Church Manager Pro — Your church, simplified.",
    pageWidth / 2,
    y + 12,
    { align: "center" }
  );

  addFooter(pageNum);

  doc.save(isFr ? "Guide_Church_Manager_Pro.pdf" : "Church_Manager_Pro_Guide.pdf");
}
