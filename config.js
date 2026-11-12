// Court-circuit : configuration.
// Le duel en direct passe par les canaux temps réel (diffusion et présence) du projet Supabase partagé
// des applications du site Ressources NSI et SNT (« SNT-1er Jour »), sans table : les duels ne sont pas enregistrés.
// COMPTES : le code de l'élève et ses programmes gardés en ligne (schéma court_circuit, supabase/0001-codes-eleves.sql).
// Il reste à false tant que la migration n'est pas appliquée dans la base (règle M7 : la page n'appelle
// que des fonctions qui existent).
// La clé ci-dessous est la clé publique « anon » du projet : elle est publique par conception.
// Pour installer ta copie : mets l'adresse et la clé publique de ton propre projet Supabase (gratuit),
// ou laisse SUPABASE_URL vide : le jeu marche alors en mode démo (salle entre les onglets d'un même navigateur).
window.CC_CONFIG = {
  SUPABASE_URL: 'https://cukahpyqkljiddmimpyi.supabase.co',
  COMPTES: false,
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2FocHlxa2xqaWRkbWltcHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDQ0MDYsImV4cCI6MjEwODUyMDQwNn0.fYITbTbfeC4UmpPjmsDIdKAmH6d2Hpfkdhio2WILgNw',
};
