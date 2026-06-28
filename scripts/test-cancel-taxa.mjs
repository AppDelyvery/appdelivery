import { readFileSync } from "node:fs";
import pg from "pg";
const env=Object.fromEntries(readFileSync(new URL("../.env.local",import.meta.url),"utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const m=env.DATABASE_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:\/]+):(\d+)\/(.+)$/);
const c=new pg.Client({user:m[1],password:m[2],host:m[3],port:+m[4],database:m[5],ssl:{rejectUnauthorized:false}});
await c.connect();
// pedido coletado (tem entregador + foi cobrado)
const p=(await c.query("select id, estabelecimento_id, entregador_id, preco_total from pedidos where status='coletado' and entregador_id is not null limit 1")).rows[0];
const eAntes=(await c.query("select saldo_carteira from estabelecimentos where id=$1",[p.estabelecimento_id])).rows[0].saldo_carteira;
const dAntes=(await c.query("select saldo from entregadores where id=$1",[p.entregador_id])).rows[0].saldo;
await c.query("begin");
await c.query("update config set taxa_cancelamento=3 where id=1");          // liga taxa R$3
await c.query("insert into cancelamentos (pedido_id,por,motivo,status_antes) values ($1,'estabelecimento','desistiu','coletado')",[p.id]);
await c.query("update pedidos set status='cancelado' where id=$1",[p.id]);   // dispara estornar
const eDep=(await c.query("select saldo_carteira from estabelecimentos where id=$1",[p.estabelecimento_id])).rows[0].saldo_carteira;
const dDep=(await c.query("select saldo from entregadores where id=$1",[p.entregador_id])).rows[0].saldo;
const pg2=(await c.query("select metodo,valor from pagamentos where pedido_id=$1 and metodo='compensacao'",[p.id])).rows[0];
await c.query("rollback");
console.log("frete:", p.preco_total, "| taxa cancelamento: R$3");
console.log("lojista carteira:", eAntes, "->", eDep, "(estorno esperado: frete - 3)");
console.log("entregador saldo:", dAntes, "->", dDep, "(esperado: +3)");
console.log("pagamento compensacao:", pg2? pg2.metodo+" R$"+pg2.valor : "NENHUM");
await c.end();
