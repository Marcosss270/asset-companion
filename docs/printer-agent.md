# Agente Local SNMP — Impressoras GRUPO A3

O backend do sistema corre na nuvem (Cloudflare Workers) e **não consegue aceder a IPs internos da rede da empresa**. Para monitorizar impressoras via SNMP é necessário instalar um pequeno agente Node.js dentro da rede onde estão as impressoras. O agente faz as consultas SNMP localmente e envia as leituras para o sistema.

## Endpoint de ingestão

```
POST https://<seu-dominio-lovable>/api/public/printers/ingest
Headers:
  Content-Type: application/json
  x-ingest-token: <PRINTER_INGEST_TOKEN>
Body:
{
  "ip": "192.168.1.50",            // ou "impressora_id": "<uuid>"
  "leitura": {
    "toner_preto": 78,
    "toner_ciano": 65,
    "toner_magenta": 70,
    "toner_amarelo": 50,
    "papel_pct": 80,
    "online": true,
    "contador_impressoes": 12450,
    "erros_hw": null
  }
}
```

O token é o secret `PRINTER_INGEST_TOKEN` configurado em Lovable Cloud.

## Agente mínimo (Node.js)

```bash
npm i net-snmp axios
```

```js
// agent.js — corre em loop a cada 5 minutos
const snmp = require("net-snmp");
const axios = require("axios");

const ENDPOINT = "https://<seu-dominio>/api/public/printers/ingest";
const TOKEN = process.env.PRINTER_INGEST_TOKEN;

// OIDs padrão Printer-MIB (RFC 3805)
const OID = {
  toner_preto: "1.3.6.1.2.1.43.11.1.1.9.1.1",
  papel_pct:   "1.3.6.1.2.1.43.8.2.1.10.1.1",
  contador:    "1.3.6.1.2.1.43.10.2.1.4.1.1",
};

const printers = [
  { ip: "192.168.1.50", community: "public" },
  { ip: "192.168.1.51", community: "public" },
];

async function poll(p) {
  const session = snmp.createSession(p.ip, p.community);
  return new Promise((resolve) => {
    session.get(Object.values(OID), async (err, varbinds) => {
      session.close();
      const online = !err;
      const leitura = online ? {
        toner_preto: Number(varbinds[0]?.value) || null,
        papel_pct: Number(varbinds[1]?.value) || null,
        contador_impressoes: Number(varbinds[2]?.value) || null,
        online: true,
      } : { online: false, erros_hw: String(err?.message ?? "timeout") };

      await axios.post(ENDPOINT, { ip: p.ip, leitura }, {
        headers: { "x-ingest-token": TOKEN },
      }).catch((e) => console.error(p.ip, e.message));
      resolve();
    });
  });
}

setInterval(() => printers.forEach(poll), 5 * 60 * 1000);
printers.forEach(poll);
```

## Regras automáticas (executadas no servidor)

- Toner < 40% → alerta médio + sugestão de compra
- Toner < 20% → alerta crítico + sugestão urgente
- Papel < 25% → alerta de papel baixo
- `online=false` → alerta crítico de impressora offline
