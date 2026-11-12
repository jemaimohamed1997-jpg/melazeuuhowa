"""
Huilerie Jemai (معصرة جماعي) - Générateur de Bons d'Impression A4 / Thermique
Formatage professionnel en français avec en-tête officiel, logo, détails cuve/client et signatures.
"""

import datetime

def generer_html_bon(mouvement: dict, client: dict, cuve: dict, duplicata: bool = False) -> str:
    """Génère le code HTML prêt pour l'impression A4 standard ou thermique sous Windows 11."""
    type_titre = {
        "ENTREE": "BON DE RÉCEPTION D'HUILE D'OLIVE",
        "SORTIE": "BON DE LIVRAISON / SORTIE D'HUILE",
        "TRANSFERT_SORTIE": "BON DE TRANSFERT (SORTIE CUVE)",
        "TRANSFERT_ENTREE": "BON DE TRANSFERT (ENTRÉE CUVE)",
        "ANNULATION": "AVIS D'ANNULATION / CONTRE-PASSATION"
    }.get(mouvement.get("type_mouvement", "ENTREE"), "BON DE MOUVEMENT D'HUILE")

    badge_duplicata = """
    <div style="position: absolute; right: 20px; top: 20px; border: 2px dashed #b91c1c; color: #b91c1c; padding: 4px 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; transform: rotate(-5deg);">
        DUPLICATA
    </div>
    """ if duplicata else ""

    date_str = mouvement.get("date_mouvement", datetime.datetime.now().strftime("%d/%m/%Y %H:%M"))
    quantite = float(mouvement.get("quantite", 0.0))

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{type_titre} - {mouvement.get('numero_bon', '')}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1c1917;
            margin: 0;
            padding: 24px;
            background: #ffffff;
        }}
        .receipt-container {{
            position: relative;
            max-width: 780px;
            margin: 0 auto;
            border: 2px solid #292524;
            padding: 24px;
            border-radius: 6px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2d4a22;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }}
        .company-title {{
            font-size: 24px;
            font-weight: 800;
            color: #2d4a22;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .company-sub {{
            font-size: 20px;
            font-weight: 700;
            color: #78350f;
            direction: rtl;
            font-family: 'Amiri', 'Traditional Arabic', serif;
        }}
        .company-meta {{
            font-size: 11px;
            color: #57534e;
            margin-top: 4px;
            line-height: 1.4;
        }}
        .bon-badge {{
            text-align: right;
        }}
        .bon-number {{
            font-family: monospace;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            padding: 4px 10px;
            border: 1px solid #cbd5e1;
            display: inline-block;
            border-radius: 4px;
        }}
        .title-bar {{
            background: #2d4a22;
            color: #ffffff;
            text-align: center;
            padding: 8px;
            font-weight: 700;
            font-size: 15px;
            letter-spacing: 1px;
            margin-bottom: 20px;
            border-radius: 3px;
        }}
        .info-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }}
        .info-box {{
            background: #fafaf9;
            border: 1px solid #e7e5e4;
            padding: 12px;
            border-radius: 4px;
        }}
        .info-box-title {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #78716c;
            border-bottom: 1px solid #e7e5e4;
            padding-bottom: 4px;
            margin-bottom: 8px;
        }}
        .info-row {{
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 5px;
        }}
        .info-label {{
            color: #57534e;
        }}
        .info-value {{
            font-weight: 600;
            color: #1c1917;
        }}
        .table-qty {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }}
        .table-qty th {{
            background: #f5f5f4;
            border: 1px solid #d6d3d1;
            padding: 10px;
            font-size: 12px;
            text-transform: uppercase;
            text-align: left;
        }}
        .table-qty td {{
            border: 1px solid #d6d3d1;
            padding: 12px 10px;
            font-size: 14px;
        }}
        .qty-highlight {{
            font-size: 20px;
            font-weight: 800;
            color: #15803d;
            font-family: monospace;
        }}
        .signatures {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 35px;
            padding-top: 15px;
        }}
        .signature-box {{
            border-top: 1px dashed #a8a29e;
            padding-top: 8px;
            text-align: center;
            font-size: 12px;
            color: #44403c;
            min-height: 70px;
        }}
        .footer {{
            text-align: center;
            font-size: 10px;
            color: #78716c;
            margin-top: 25px;
            border-top: 1px solid #f5f5f4;
            padding-top: 8px;
        }}
        @media print {{
            body {{ padding: 0; }}
            .receipt-container {{ border: none; padding: 0; }}
        }}
    </style>
</head>
<body>
    <div class="receipt-container">
        {badge_duplicata}
        <div class="header">
            <div>
                <div class="company-title">HUILERIE JEMAI</div>
                <div class="company-sub">معصرة جماعي لإنتاج وتخزين زيت الزيتون</div>
                <div class="company-meta">
                    Extraction traditionnelle & moderne d'huile d'olive de qualité supérieure<br>
                    Stockage sécurisé sous cuves inox alimentaires certifiées
                </div>
            </div>
            <div class="bon-badge">
                <div style="font-size: 11px; color: #57534e; margin-bottom: 4px;">N° DU BON OFFICIEL</div>
                <div class="bon-number">{mouvement.get('numero_bon', 'BON-0000')}</div>
                <div style="font-size: 11px; color: #78716c; margin-top: 4px;">Date : {date_str}</div>
            </div>
        </div>

        <div class="title-bar">
            {type_titre}
        </div>

        <div class="info-grid">
            <div class="info-box">
                <div class="info-box-title">Identité du Client / Déposant</div>
                <div class="info-row">
                    <span class="info-label">Code Client :</span>
                    <span class="info-value">{client.get('code_client', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Nom / Raison :</span>
                    <span class="info-value">{client.get('nom_complet', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Téléphone :</span>
                    <span class="info-value">{client.get('telephone', 'Non renseigné')}</span>
                </div>
            </div>

            <div class="info-box">
                <div class="info-box-title">Localisation du Stockage</div>
                <div class="info-row">
                    <span class="info-label">N° de Cuve / Pile :</span>
                    <span class="info-value">{cuve.get('numero', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Désignation :</span>
                    <span class="info-value">{cuve.get('nom', 'N/A')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Opérateur :</span>
                    <span class="info-value">{mouvement.get('utilisateur', 'Opérateur')}</span>
                </div>
            </div>
        </div>

        <table class="table-qty">
            <thead>
                <tr>
                    <th>Désignation de l'article</th>
                    <th>Pile Réceptrice</th>
                    <th style="text-align: right;">Quantité Enregistrée</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>Huile d'olive extra-vierge</strong><br>
                        <span style="font-size: 11px; color: #78716c;">
                            {mouvement.get('observations') or 'Contrôle qualité effectué - Conforme'}
                        </span>
                    </td>
                    <td>{cuve.get('nom', 'N/A')} ({cuve.get('numero', '')})</td>
                    <td style="text-align: right;">
                        <span class="qty-highlight">{quantite:,.2f}</span> <strong>Litres (L)</strong>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="signatures">
            <div class="signature-box">
                Visa & Signature du Client / Déposant :<br><br><br>
                <em>(Précédé de la mention "Lu et approuvé")</em>
            </div>
            <div class="signature-box">
                Cachet & Signature de Huilerie Jemai :<br><br><br>
                <strong>Pour la Direction / Opérateur de Cuverie</strong>
            </div>
        </div>

        <div class="footer">
            Document officiel généré par le logiciel de gestion de stock Huilerie Jemai.<br>
            Conserver ce bon pour toute opération ultérieure de retrait ou de transfert.
        </div>
    </div>
</body>
</html>
"""
    return html
