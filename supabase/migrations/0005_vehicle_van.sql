-- APPDELYVERY — veículos = moto, carro, VAN (sem bike). Rodar no SQL Editor.
-- 'bike' permanece no enum por compatibilidade, mas NÃO é oferecido em nenhuma tela.
-- (Postgres não remove valor de enum facilmente; deixá-lo inerte é seguro.)
alter type vehicle_type add value if not exists 'van';
