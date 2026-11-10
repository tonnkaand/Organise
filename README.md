# Organise — To-Do App
Application de gestion de tâches : Java 21, Spring Boot REST, H2, interface HTML/CSS/JS et cache IndexedDB.

## Lancer
Prérequis : JDK 21 et Maven 3.9+.
```bash
mvn clean verify
mvn spring-boot:run
```
Ouvrir http://localhost:8080.

## API
- `GET/POST /api/projects` ; `GET/PUT/DELETE /api/projects/{id}`
- `GET/POST /api/tasks` ; `GET/PUT/DELETE /api/tasks/{id}`
- `GET /api/tasks/by-project/{projectId}`

Exemple JSON tâche :
```json
{"title":"Préparer le devoir","description":"Relire le cours","projectId":1,"priority":"HIGH","status":"TODO","dueDate":"2026-12-01"}
```

## Règles
- Le titre est obligatoire.
- Priorité : LOW, MEDIUM, HIGH. Statut : TODO, IN_PROGRESS, DONE.
- Une tâche doit être liée à un projet existant.
- Un projet contenant des tâches ne peut pas être supprimé.
- Une tâche est en retard si sa date est passée et qu'elle n'est pas terminée.

## Persistance et qualité
H2 conserve les données serveur dans `./data/tododb`. IndexedDB conserve une copie locale des listes récupérées. Cette version est online-first : elle ne propose pas encore les écritures hors ligne ni la synchronisation bidirectionnelle.
JaCoCo vérifie un seuil de 80 % de couverture des branches lors de `mvn clean verify`. PIT est lancé avec `mvn test-compile org.pitest:pitest-maven:mutationCoverage`. Ces seuils doivent être confirmés par une exécution réelle.
