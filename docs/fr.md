# Polar

## Présentation

Cette intégration amène dans Gladys les données de votre compte **Polar Flow** (montres et capteurs cardio Polar), par l’API officielle **Polar AccessLink** : activité du jour, dernière nuit, Nightly Recharge, entraînements et charge cardio, sous forme d’appareil, de widgets et de scènes.

- **Un appareil par compte lié** (« Polar Marie ») : pas, temps actif, calories, distance et objectif du jour ; score et durée de sommeil ; statut Nightly Recharge, charge SNA, variabilité cardiaque, fréquence cardiaque et respiratoire de la nuit ; statut et ratio de charge cardio.
- **Widgets** : aujourd’hui (avec un bouton **Synchroniser**), dernière nuit, derniers entraînements, sept derniers jours.
- **Scènes** : entraînement synchronisé, nouvelle nuit, nouvelle Nightly Recharge, objectif d’activité atteint ; une action lit les dernières valeurs (poids compris) pour un message ou une condition.
- **Cloud** : vos données transitent entre les serveurs de Polar et votre Gladys, avec **votre propre client AccessLink** ; rien ne passe par un serveur tiers. Polar n’envoie aucune notification à Gladys : l’intégration lit Polar toutes les **30 minutes** (réglable) et quand vous appuyez sur **Synchroniser**.
- **Après la synchro de la montre** : Polar ne connaît que ce que la montre a synchronisé avec Polar Flow (application mobile ou ordinateur). Une nuit apparaît après la synchro du matin, un entraînement après la sienne.

Intégration communautaire, sans lien avec Polar Electro. Pas encore testée avec un vrai compte Polar : dites-nous ce que vous voyez.

![Les widgets Polar : aujourd’hui, dernière nuit, entraînements et sept derniers jours (illustration générée, pas une capture d’écran)](https://raw.githubusercontent.com/William-De71/gladys-polar/main/docs/assets/widgets.fr.png)

## Prérequis

- Gladys **5.3.0** ou plus récent.
- Un compte Polar Flow avec une montre ou un capteur Polar qui se synchronise avec Polar Flow.
- Un **client API AccessLink** gratuit, créé une fois avec votre compte Polar Flow (environ cinq minutes). Polar ne propose pas de clé partagée et l’intégration n’en embarque aucune.

## Configuration

### 1. Créez votre client AccessLink

1. Ouvrez [admin.polaraccesslink.com](https://admin.polaraccesslink.com) et connectez-vous avec votre compte **Polar Flow**.
2. Acceptez les conditions AccessLink si elles sont demandées, puis créez un nouveau client (application) : un nom (« Gladys »), une description, une adresse e-mail de contact et, si demandé, un site web (`https://gladysassistant.com` convient).
3. Comme **URL de redirection d’autorisation** (callback), saisissez exactement :

   ```
   https://my.gladysassistant.com/redirect/oauth
   ```

   C’est la page HTTPS de Gladys qui renvoie votre navigateur vers votre instance, quelle que soit son adresse. Si vous accédez à Gladys en HTTPS et avez activé l’option avancée « adresse de l’instance » de l’écran de configuration, déclarez plutôt l’adresse affichée par cet écran (ou les deux : Polar accepte plusieurs URL, celle envoyée doit être identique à l’une d’elles).

4. Enregistrez, puis copiez le **Client ID** et le **Client secret** affichés pour le client.

### 2. Dans Gladys

1. Ouvrez l’intégration **Polar**, collez le **Client ID** et le **Client secret**, puis **enregistrez**.
2. Cliquez sur **Se connecter avec Polar**, connectez-vous à Polar Flow et acceptez. Vous revenez dans Gladys, connecté : l’intégration inscrit votre compte auprès de votre client et le lit.
3. Allez dans **Découverte** et ajoutez l’appareil « Polar … », puis ajoutez les widgets à un tableau de bord.
4. Synchronisez votre montre avec Polar Flow : **Polar ne partage que les données synchronisées après la liaison**. Appuyez ensuite sur **Synchroniser** (ou attendez la lecture suivante).

| Champ                   | Par défaut  | Rôle                                                                                   |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Client ID               | —           | Le Client ID de votre client AccessLink.                                               |
| Client secret           | —           | Son secret, jamais affiché ni écrit dans les journaux.                                 |
| Se connecter avec Polar | —           | Lie votre compte Polar Flow (lecture seule : `accesslink.read_all`).                   |
| Intervalle de lecture   | 30 min      | 15, 30, 60 ou 120 minutes ; chaque lecture coûte 5 ou 6 requêtes.                      |
| Langue des textes       | Automatique | Noms de l’appareil et des fonctionnalités, statut de charge cardio, textes des scènes. |

Boutons : **Synchroniser maintenant** (pas deux fois en deux minutes), **Délier le compte Polar** (le désinscrit de votre client et oublie le jeton ; l’appareil reste) et **Diagnostic** (écrit un résumé anonymisé dans l’onglet Journaux).

## Utilisation

### Appareil

| Fonctionnalité               | Unité / échelle              | Mise à jour                  |
| ---------------------------- | ---------------------------- | ---------------------------- |
| Pas du jour                  | pas                          | après chaque synchro du jour |
| Temps actif du jour          | minutes                      | après chaque synchro du jour |
| Calories du jour             | kcal                         | après chaque synchro du jour |
| Distance du jour             | km (d’après les pas)         | après chaque synchro du jour |
| Objectif d’activité du jour  | % (peut dépasser 100)        | après chaque synchro du jour |
| Score de sommeil             | 1 à 100                      | après la synchro du matin    |
| Durée de sommeil             | heures                       | après la synchro du matin    |
| Statut Nightly Recharge      | 1 très faible … 6 très bonne | après la synchro du matin    |
| Charge SNA                   | -10 à +10                    | après la synchro du matin    |
| Variabilité cardiaque (nuit) | ms (RMSSD)                   | après la synchro du matin    |
| Fréquence cardiaque nocturne | bpm                          | après la synchro du matin    |
| Fréquence respiratoire       | respirations par minute      | après la synchro du matin    |
| Ratio de charge cardio       | effort / tolérance           | après un entraînement        |
| Statut de charge cardio      | texte                        | après un entraînement        |

« Aujourd’hui » suit le fuseau horaire de Gladys. Avant la première synchro du jour, les fonctionnalités d’activité gardent la dernière valeur de la veille (leur date l’indique). Gladys n’a pas d’unité de poids : le poids n’est donné que par l’action de scène.

### Scènes

| Déclencheur                 | Quand                                                               | Filtres            |
| --------------------------- | ------------------------------------------------------------------- | ------------------ |
| Entraînement synchronisé    | un nouvel entraînement est arrivé dans Polar Flow                   | compte, sport      |
| Nouvelle nuit disponible    | la nuit des deux derniers jours est arrivée dans Polar Flow         | compte             |
| Nightly Recharge disponible | la Nightly Recharge des deux derniers jours est arrivée             | compte, statut 1-6 |
| Objectif d’activité atteint | l’activité du jour a atteint 100 % de l’objectif, une fois par jour | compte             |

Chaque événement porte ses valeurs (`{{triggerEvent.data.sleep_score}}`, `duration_minutes`, `status_label`…) et un `summary` tout fait. Rien ne se déclenche pour les données déjà présentes au démarrage de l’intégration. L’action **Polar : lire les dernières données** donne l’activité du jour, la dernière nuit, la Nightly Recharge, le statut d’entraînement, la dernière séance et le poids de la dernière lecture.

Exemples :

- **Nouvelle nuit disponible** → envoyer « {{triggerEvent.data.summary}} » sur votre téléphone au réveil.
- **Nightly Recharge disponible**, statut 1 ou 2 → adoucir les lumières du matin et reporter le rappel d’entraînement.
- **Entraînement synchronisé**, sport « Course à pied » → allumer le sèche-serviettes de la salle de bain.

## Dépannage

- **Polar signale « redirect_uri » ou une page d’erreur après Se connecter** : l’URL de redirection du client n’est pas identique à celle envoyée par Gladys. Vérifiez `https://my.gladysassistant.com/redirect/oauth` (sans barre finale) dans le client sur admin.polaraccesslink.com. L’onglet Journaux affiche l’URI de redirection utilisée.
- **« Polar a refusé la connexion (invalid_client) »** : Client ID ou secret erroné. Recopiez-les et enregistrez avant de vous connecter.
- **« Connexion refusée : la réponse ne correspond pas »** : l’autorisation a expiré (10 minutes) ou a été ouverte deux fois. Cliquez à nouveau sur **Se connecter avec Polar**.
- **« Polar refuse de partager les données »** (HTTP 403) : acceptez les consentements obligatoires de votre compte sur [account.polar.com](https://account.polar.com), puis **Synchroniser**.
- **« Polar a refusé l’accès »** : le jeton a été révoqué (sur Polar Flow, par **Délier**, ou après environ un an). Cliquez à nouveau sur **Se connecter avec Polar**.
- **Rien pour aujourd’hui** : synchronisez d’abord la montre avec Polar Flow ; Polar ne partage que les données synchronisées après la liaison.
- **Signaler un problème** : [issues GitHub](https://github.com/William-De71/gladys-polar/issues) avec les versions de Gladys et de l’intégration, le modèle de montre et les lignes du bouton **Diagnostic** (sans jeton ni nom).

Pourquoi pas de notification instantanée ? Les webhooks de Polar exigent une adresse publique qui répond à Polar et des requêtes signées dont Gladys Plus ne transmet pas l’en-tête : l’intégration lit donc Polar à son propre rythme.
