---
name: new-diagram
description: Scaffolds a new animated Markdy architecture diagram with standard template and beats.
---

# Scaffold New Markdy Diagram

Create a new `.markdy` diagram file in the current directory with standard directives, groups, and narrative beats:

```markdy
scene "System Architecture" theme=midnight
layout LR

browser Client "Client Application"
gateway Gateway "API Gateway"
service ApiService "Core Service"
cache Cache "Redis Cache"
database Database "PostgreSQL"

group edge "Edge": Client Gateway
group backend "Backend": ApiService
group storage "Data": Cache Database

beat init "1. Request Flow":
  show $nodes stagger=40ms
  frame Client Gateway ApiService zoom=1.12
  Client -> Gateway "POST /api/action" -> ApiService "process"
  ApiService -> Cache "check cache"
  ApiService <- Cache "miss"

beat persist "2. Data Persistence":
  frame ApiService Database zoom=1.15
  ApiService -> Database "INSERT record"
  ApiService ~> Cache "SETEX key"
  Client <- Gateway "200 Success"
  glow Database color=#22c55e
```
