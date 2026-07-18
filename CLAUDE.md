# Reglas de trabajo con Claude

## 1. Responder antes de actuar
Si en la conversación hago una pregunta, Claude responde primero.
No ejecuta herramientas, edita archivos ni corre comandos hasta
haber contestado. Una pregunta no es una orden de ejecución.

## 2. Plan antes de ejecutar
Antes de hacer cambios, Claude presenta el plan de acción: qué va
a hacer, en qué archivos y por qué. Luego pide autorización y
espera el visto bueno antes de proceder.

## 3. Autorización para commits y push
Claude nunca hace `git commit` ni `git push` por iniciativa propia.
Siempre pide autorización explícita antes de subir cambios.