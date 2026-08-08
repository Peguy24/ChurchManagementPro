import jsPDF from "jspdf";

export interface GuideFeature {
  text: string;
  /** Plan feature key (camelCase) or global platform flag key (snake_case) */
  flag?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  /** Section is hidden entirely when this flag is disabled */
  flag?: string;
  features: GuideFeature[];
}

/** Returns true when a feature/section should be shown. */
export type FeatureChecker = (flag: string) => boolean;

const f = (text: string, flag?: string): GuideFeature => ({ text, flag });

const buildSections = (lang: string): GuideSection[] => {
  const isFr = lang === "fr";
  return [
    {
      id: "members",
      title: isFr ? "Gestion des Membres" : "Member Management",
      features: isFr
        ? [
            f("Fiches membres completes (informations personnelles, spirituelles, familiales, formation)"),
            f("Numero de membre unique genere automatiquement"),
            f("Formulaire d'adhesion public par lien ou QR Code, avec approbation des demandes"),
            f("Photos de profil : capture par camera, Photo Booth et lien d'envoi pour le membre"),
            f("Cartes de membre PDF avec QR Code, pretes a imprimer", "memberCards"),
            f("Champs personnalises configurables (texte, nombre, date, liste, case a cocher)", "customFields"),
            f("Importation en masse CSV/Excel avec detection des doublons et reprise des lignes en erreur"),
            f("Historique complet du membre (presences, dons, evenements) et documents joints"),
            f("Recherche et filtres avances (statut, branche, ministere, photo manquante)"),
            f("Suivi des visiteurs et conversion en membre"),
            f("Exportation des donnees en CSV et rapports PDF"),
          ]
        : [
            f("Complete member records (personal, spiritual, family and education information)"),
            f("Auto-generated unique member number"),
            f("Public join form via link or QR Code, with request approval workflow"),
            f("Profile photos: camera capture, Photo Booth and self-upload link for members"),
            f("PDF member cards with QR Code, ready to print", "memberCards"),
            f("Configurable custom fields (text, number, date, dropdown, checkbox)", "customFields"),
            f("Bulk CSV/Excel import with duplicate detection and failed-row retry"),
            f("Full member history (attendance, donations, events) and attached documents"),
            f("Advanced search and filters (status, branch, ministry, missing photo)"),
            f("Visitor tracking and conversion into members"),
            f("CSV data export and PDF reports"),
          ],
    },
    {
      id: "attendance",
      title: isFr ? "Presence et Pointage" : "Attendance & Check-in",
      flag: "attendance",
      features: isFr
        ? [
            f("Marquage manuel de la presence avec liste des membres"),
            f("Scan de QR Code par camera et mode kiosque pour l'accueil"),
            f("Auto-pointage par le membre (numero de membre ou telephone) avec verification de localisation"),
            f("Mode hors-ligne : les pointages se synchronisent des le retour du reseau"),
            f("Statut de ponctualite automatique (en avance, a l'heure, en retard)"),
            f("Alertes d'absence configurables (2, 3, 4 semaines) envoyees aux responsables", "attendanceAlerts"),
            f("Statistiques par membre, tendances hebdomadaires et comparaison de groupes"),
            f("Rapports de presence exportables en PDF et CSV"),
          ]
        : [
            f("Manual attendance marking from the member list"),
            f("QR Code camera scanning and kiosk mode for the welcome desk"),
            f("Member self check-in (member number or phone) with location verification"),
            f("Offline mode: check-ins sync automatically once back online"),
            f("Automatic punctuality status (early, on time, late)"),
            f("Configurable absence alerts (2, 3, 4 weeks) sent to leaders", "attendanceAlerts"),
            f("Per-member statistics, weekly trends and group comparison"),
            f("Attendance reports exportable as PDF and CSV"),
          ],
    },
    {
      id: "finances",
      title: isFr ? "Gestion Financiere" : "Financial Management",
      flag: "donations",
      features: isFr
        ? [
            f("Enregistrement des dons et dimes avec categories par defaut et personnalisees"),
            f("Recus de don en PDF et recus fiscaux annuels par membre"),
            f("Gestion des depenses avec workflow d'approbation (en attente, approuve, rejete)", "advancedFinance"),
            f("Categories de revenus et de depenses personnalisables"),
            f("Comptes bancaires avec suivi du solde en temps reel", "advancedFinance"),
            f("Caisses (petite caisse) avec controle strict du solde", "cashRegister"),
            f("Rapprochement bancaire et rapport PDF dedie", "bankReconciliation"),
            f("Budgets annuels par categorie (prevu vs realise)", "advancedFinance"),
            f("Fonds speciaux (construction, mission, aide sociale) avec objectifs et progression", "advancedFinance"),
            f("Salaires et prets/credits synchronises avec les depenses et les soldes", "advancedFinance"),
            f("Piste d'audit inviolable de toutes les operations financieres"),
            f("Support multi-devises (HTG, USD, EUR, etc.)"),
          ]
        : [
            f("Donation and tithe recording with default and custom categories"),
            f("PDF donation receipts and annual fiscal receipts per member"),
            f("Expense management with approval workflow (pending, approved, rejected)", "advancedFinance"),
            f("Customizable income and expense categories"),
            f("Bank accounts with real-time balance tracking", "advancedFinance"),
            f("Cash registers (petty cash) with strict balance validation", "cashRegister"),
            f("Bank reconciliation with a dedicated PDF report", "bankReconciliation"),
            f("Annual budgets by category (planned vs actual)", "advancedFinance"),
            f("Special funds (building, mission, social aid) with goals and progress", "advancedFinance"),
            f("Salaries and loans/credits synchronized with expenses and balances", "advancedFinance"),
            f("Tamper-proof audit trail of every financial operation"),
            f("Multi-currency support (HTG, USD, EUR, etc.)"),
          ],
    },
    {
      id: "giving",
      title: isFr ? "Dons en Ligne" : "Online Giving",
      flag: "online_giving",
      features: isFr
        ? [
            f("Page de don publique a l'image de votre eglise, accessible par lien ou QR Code"),
            f("Paiements par carte securises et verses directement sur le compte de l'eglise"),
            f("Dons ponctuels avec choix de la categorie (dime, offrande, fonds special)"),
            f("Enregistrement automatique du don dans la comptabilite"),
            f("Recu envoye au donateur par email"),
          ]
        : [
            f("Public giving page branded for your church, shared by link or QR Code"),
            f("Secure card payments paid directly into the church account"),
            f("One-time gifts with category selection (tithe, offering, special fund)"),
            f("Gifts recorded automatically in the accounting module"),
            f("Receipt emailed to the donor"),
          ],
    },
    {
      id: "events",
      title: isFr ? "Evenements et Ministeres" : "Events & Ministries",
      features: isFr
        ? [
            f("Planification d'evenements (date, heure, lieu, description) et calendrier annuel"),
            f("Inscription publique aux evenements par lien ou QR Code, sans compte"),
            f("Suivi des inscriptions et du nombre de participants attendus"),
            f("Rappels automatiques par email avant les evenements"),
            f("Gestion des ministeres avec responsable et membres affectes"),
            f("Statistiques de participation par ministere"),
            f("Planification des benevoles par service et par poste", "volunteerScheduling"),
          ]
        : [
            f("Event planning (date, time, location, description) and annual calendar"),
            f("Public event registration by link or QR Code, no account required"),
            f("Registration tracking and expected attendee counts"),
            f("Automatic email reminders before events"),
            f("Ministry management with leaders and assigned members"),
            f("Per-ministry participation statistics"),
            f("Volunteer scheduling per service and per role", "volunteerScheduling"),
          ],
    },
    {
      id: "branches",
      title: isFr ? "Gestion Multi-Branches" : "Multi-Branch Management",
      features: isFr
        ? [
            f("Support de plusieurs branches/sites pour une meme eglise"),
            f("Hierarchie de branches (eglise mere et sous-branches)"),
            f("Affectation des membres, evenements et finances par branche"),
            f("Responsable designe par branche et acces limite a sa branche"),
            f("Rapports consolides ou filtres par branche"),
          ]
        : [
            f("Support for multiple branches/campuses of the same church"),
            f("Branch hierarchy (main church and sub-branches)"),
            f("Member, event and finance assignment per branch"),
            f("Designated branch leaders with branch-scoped access"),
            f("Consolidated or branch-filtered reports"),
          ],
    },
    {
      id: "reports",
      title: isFr ? "Rapports et Tableaux de Bord" : "Reports & Dashboards",
      features: isFr
        ? [
            f("Tableau de bord principal (membres, presences, finances) et suivi d'integration"),
            f("Tableau de bord financier avec graphiques revenus vs depenses"),
            f("Rapports detailles : membres, presences, finances, evenements, anniversaires, inventaire, audit", "advancedReports"),
            f("Comparaison de groupes (branches, ministeres) avec graphiques"),
            f("Score de sante de l'eglise", "churchHealth"),
            f("Exportation PDF et CSV normalisee (en-tetes traduits, sans identifiants techniques)"),
            f("Sauvegarde et export complet des donnees de l'eglise", "dataBackup"),
          ]
        : [
            f("Main dashboard (members, attendance, finances) and onboarding progress"),
            f("Financial dashboard with revenue vs expense charts"),
            f("Detailed reports: members, attendance, finances, events, birthdays, inventory, audit", "advancedReports"),
            f("Group comparison (branches, ministries) with charts"),
            f("Church health score", "churchHealth"),
            f("Standardized PDF and CSV exports (translated headers, no technical IDs)"),
            f("Full church data backup and export", "dataBackup"),
          ],
    },
    {
      id: "inventory",
      title: isFr ? "Gestion de l'Inventaire" : "Inventory Management",
      flag: "inventory",
      features: isFr
        ? [
            f("Suivi des biens et equipements (mobilier, instruments, audio/video)"),
            f("Codes-barres, numeros de serie et impression d'etiquettes"),
            f("Photos des articles et suivi de l'etat et de la valeur"),
            f("Historique de maintenance et planification des interventions"),
            f("Mode audit pour la verification physique"),
            f("Alertes de stock minimum et rapport PDF complet"),
            f("Acces restreint aux roles autorises (admin, pasteur, tresorier, secretaire)"),
          ]
        : [
            f("Church asset and equipment tracking (furniture, instruments, audio/video)"),
            f("Barcodes, serial numbers and label printing"),
            f("Item photos with condition and value tracking"),
            f("Maintenance history and service scheduling"),
            f("Audit mode for physical stock verification"),
            f("Minimum stock alerts and complete PDF report"),
            f("Access restricted to authorized roles (admin, pastor, treasurer, secretary)"),
          ],
    },
    {
      id: "communication",
      title: "Communication",
      features: isFr
        ? [
            f("Modeles d'emails personnalisables avec editeur visuel", "emailNotifications"),
            f("Envois groupes cibles (branche, ministere, statut)", "bulkCommunication"),
            f("Notifications automatiques : bienvenue, anniversaires, rappels de service, absences"),
            f("Automatisations d'engagement declenchees par evenement", "automations"),
            f("Demandes de priere avec suivi par l'equipe pastorale", "prayer_requests"),
            f("Messagerie de support integree avec l'equipe de la plateforme"),
            f("Emails multilingues (francais, anglais, creole haitien)"),
          ]
        : [
            f("Customizable email templates with a visual editor", "emailNotifications"),
            f("Targeted bulk messaging (branch, ministry, status)", "bulkCommunication"),
            f("Automatic notifications: welcome, birthdays, service reminders, absences"),
            f("Event-triggered engagement automations", "automations"),
            f("Prayer requests followed up by the pastoral team", "prayer_requests"),
            f("Built-in support messaging with the platform team"),
            f("Multilingual emails (French, English, Haitian Creole)"),
          ],
    },
    {
      id: "website",
      title: isFr ? "Site Web de l'Eglise" : "Church Website",
      flag: "church_website",
      features: isFr
        ? [
            f("Mini-site public de l'eglise avec modeles prets a l'emploi"),
            f("Pages additionnelles, mediatheque et personnalisation des couleurs"),
            f("Adresse dediee et prise en charge d'un nom de domaine personnalise"),
            f("Affichage des evenements et lien vers les dons en ligne"),
          ]
        : [
            f("Public church mini-site built from ready-made templates"),
            f("Extra pages, media library and color customization"),
            f("Dedicated address with custom domain support"),
            f("Event listings and link to the online giving page"),
          ],
    },
    {
      id: "insights",
      title: isFr ? "Analyses Intelligentes (IA)" : "Smart Insights (AI)",
      flag: "smartInsights",
      features: isFr
        ? [
            f("Scores d'engagement calcules automatiquement pour chaque membre"),
            f("Detection des membres a risque de decrochage et alertes pastorales"),
            f("Analyse des tendances de presence et de generosite"),
            f("Recommandations d'actions concretes pour le suivi pastoral"),
            f("Assistant IA pastoral pour interroger vos donnees en langage naturel", "aiAssistant"),
          ]
        : [
            f("Automatically computed engagement score for each member"),
            f("At-risk member detection with pastoral alerts"),
            f("Attendance and giving trend analysis"),
            f("Concrete action recommendations for pastoral follow-up"),
            f("Pastoral AI assistant to query your data in plain language", "aiAssistant"),
          ],
    },
    {
      id: "settings",
      title: isFr ? "Parametres et Configuration" : "Settings & Configuration",
      features: isFr
        ? [
            f("Informations de l'eglise (nom, adresse, logo, coordonnees)"),
            f("Selection de la devise et de la langue de l'interface"),
            f("Gestion des utilisateurs, roles personnalises et permissions par module"),
            f("Invitations d'administrateurs par lien securise a usage unique"),
            f("Personnalisation de la marque : logo, nom, couleurs", "branding"),
            f("Abonnement et facturation : plans Essentiel, Professionnel, Entreprise"),
            f("Guide du systeme telechargeable en PDF"),
          ]
        : [
            f("Church information (name, address, logo, contact details)"),
            f("Currency and interface language selection"),
            f("User management, custom roles and per-module permissions"),
            f("Administrator invitations via secure single-use links"),
            f("Brand customization: logo, name, colors", "branding"),
            f("Subscription and billing: Essentiel, Professionnel, Entreprise plans"),
            f("Downloadable system guide in PDF"),
          ],
    },
    {
      id: "security",
      title: isFr ? "Securite et Controle d'Acces" : "Security & Access Control",
      features: isFr
        ? [
            f("Authentification securisee par email et mot de passe"),
            f("Verification en deux etapes (code a usage unique) pour les administrateurs"),
            f("Roles predefinis : Administrateur, Pasteur, Tresorier, Secretaire, Benevole"),
            f("Permissions granulaires par module et acces limite a la branche"),
            f("Isolation complete des donnees entre les eglises"),
            f("Deconnexion automatique apres 30 minutes d'inactivite"),
            f("Piste d'audit des actions sensibles et approbation des nouveaux utilisateurs"),
            f("Chiffrement des donnees en transit et au repos"),
          ]
        : [
            f("Secure email and password authentication"),
            f("Two-step verification (one-time code) for administrators"),
            f("Predefined roles: Administrator, Pastor, Treasurer, Secretary, Volunteer"),
            f("Granular per-module permissions and branch-scoped access"),
            f("Complete data isolation between churches"),
            f("Automatic logout after 30 minutes of inactivity"),
            f("Audit trail of sensitive actions and approval of new users"),
            f("Data encryption in transit and at rest"),
          ],
    },
  ];
};

/** Sections filtered against what is actually enabled for this church. */
export function getGuideSections(lang: string, isEnabled?: FeatureChecker): GuideSection[] {
  const allowed = (flag?: string) => (!flag || !isEnabled ? true : isEnabled(flag));
  return buildSections(lang)
    .filter((s) => allowed(s.flag))
    .map((s) => ({ ...s, features: s.features.filter((ft) => allowed(ft.flag)) }))
    .filter((s) => s.features.length > 0);
}

export function generateSystemGuidePDF(lang: string = "fr", isEnabled?: FeatureChecker) {
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
    doc.text(`Church Management Pro -- ${isFr ? "Guide du Systeme" : "System Guide"}`, margin, pageHeight - 10);
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
  doc.text("Church Management Pro", pageWidth / 2, pageHeight * 0.3, { align: "center" });

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
    isFr ? "Plateforme de Gestion d'Eglise" : "Church Management Platform",
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

  const sections = getGuideSections(lang, isEnabled);
  const numberedTitle = (section: GuideSection, idx: number) => `${idx + 1}. ${section.title}`;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  sections.forEach((section, idx) => {
    checkPageBreak(8);
    doc.text(numberedTitle(section, idx), margin + 5, y);
    y += 8;
  });

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const introLines = doc.splitTextToSize(
    isFr
      ? "Ce document presente les fonctionnalites de la plateforme Church Management Pro actuellement disponibles pour votre eglise."
      : "This document presents the Church Management Pro features currently available for your church.",
    contentWidth
  );
  introLines.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, y);
    y += 6;
  });

  addFooter(pageNum);

  // ── Content Sections ──
  sections.forEach((section, idx) => {
    addPage();
    pageNum++;

    // Section header with colored bar
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, y, contentWidth, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(numberedTitle(section, idx), margin + 5, y + 9);
    y += 20;

    // Features
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    section.features.forEach((feature) => {
      const lines = doc.splitTextToSize(`•  ${feature.text}`, contentWidth - 10);
      const lineHeight = 5.5;
      const blockHeight = lines.length * lineHeight + 3;

      checkPageBreak(blockHeight);

      lines.forEach((line: string) => {
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

  const summaryItems = sections.map((section, idx) =>
    `- ${numberedTitle(section, idx)}`
  );

  summaryItems.forEach((item) => {
    const lines = doc.splitTextToSize(item, contentWidth - 10);
    checkPageBreak(lines.length * 6 + 2);
    lines.forEach((line: string) => {
      doc.text(line, margin + 5, y);
      y += 6;
    });
    y += 2;
  });

  y += 10;
  checkPageBreak(30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const noteLines = doc.splitTextToSize(
    isFr
      ? "Note : seules les fonctionnalites activees pour votre eglise figurent dans ce guide. D'autres modules peuvent etre disponibles avec un plan superieur."
      : "Note: only the features enabled for your church appear in this guide. Additional modules may be available on a higher plan.",
    contentWidth
  );
  noteLines.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, y);
    y += 6;
  });

  y += 10;
  checkPageBreak(24);
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(
    isFr ? "Church Management Pro -- Votre eglise, simplifiee." : "Church Management Pro -- Your church, simplified.",
    pageWidth / 2,
    y + 12,
    { align: "center" }
  );

  addFooter(pageNum);

  doc.save(isFr ? "Guide_Church_Management_Pro.pdf" : "Church_Management_Pro_Guide.pdf");
}
