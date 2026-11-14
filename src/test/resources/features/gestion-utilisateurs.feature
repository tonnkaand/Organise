
# language: fr

Fonctionnalité: Gestion des comptes et protection des données utilisateurs
  En tant qu'utilisateur d'Organise
  Je veux pouvoir gérer mon compte et mes données en toute sécurité
  Afin que mes projets et mes tâches restent privés.

  Scénario: Inscription d'un nouvel utilisateur
    Quand je m'inscris avec un nom, une adresse email et un mot de passe valides
    Alors mon compte est créé
    Et mes informations personnelles sont retournées sans mon mot de passe

  @compte-existant
  Scénario: Refus d'une inscription avec une adresse email déjà utilisée
    Quand je tente de créer un autre compte avec cette adresse email
    Alors l'inscription est refusée

  @compte
  Scénario: Connexion avec des identifiants corrects
    Quand je me connecte avec mon adresse email et mon mot de passe corrects
    Alors je suis authentifié
    Et une session utilisateur est créée

  @compte
  Scénario: Refus de connexion avec un mot de passe incorrect
    Quand je tente de me connecter avec un mauvais mot de passe
    Alors la connexion est refusée

  @connecte
  Scénario: Déconnexion d'un utilisateur
    Quand je me déconnecte
    Alors ma session est terminée
    Et je ne peux plus accéder aux ressources privées

  @non-connecte
  Scénario: Refus d'accès aux ressources sans authentification
    Quand je tente de consulter mes projets
    Alors l'accès est refusé

  @isolation-projets
  Scénario: Isolation des projets entre deux utilisateurs
    Quand le premier utilisateur consulte le projet du second
    Alors l'accès est refusé
    Et le projet du second utilisateur reste intact

  @isolation-taches
  Scénario: Isolation des tâches entre deux utilisateurs
    Quand le premier utilisateur tente de consulter la tâche du second
    Alors l'accès est refusé
    Et la tâche du second utilisateur reste intacte
