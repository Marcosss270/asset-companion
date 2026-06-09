# A3 Agent v1

Agente Windows que reporta inventário e descoberta de rede ao Asset Companion.

## Instalação

1. Em `A3 Agent` → **Novo agente**, atribua um nome.
2. Copie o comando PowerShell mostrado (executar como administrador):

   ```powershell
   iwr -useb https://<seu-domínio>/agent/a3-agent.ps1 | iex
   Install-A3Agent -Url 'https://<seu-domínio>' -Token '<token>'
   ```

3. A tarefa `A3Agent` é registada e dispara a cada 5 minutos.

## O que coleta

- Hostname, utilizador atual, IP, MAC
- Sistema operativo + versão
- CPU, RAM, disco (C:)
- ARP/ping sweep da subnet local → `/descoberta` (a cada hora)

## Não faz

- Controle remoto
- Execução de comandos
- Gestão de software
