import tempfile, unittest
from pathlib import Path
from omega.db import init_db
from omega.core import ingest_file, ensure_span, add_node, add_relation, search, trace_node, contradictions, open_loops, validate, context_packet
from omega.events import rebuild_from_log

class OmegaCoreTest(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory()
        self.root=Path(self.t.name)
        self.db=self.root/'db.sqlite'
        self.log=self.root/'events.jsonl'
        init_db(self.db)
        f=self.root/'src.txt'; f.write_text('Alpha claim. Beta decision. Gamma question.',encoding='utf-8')
        self.src=ingest_file(self.db,self.log,f)
        self.span=ensure_span(self.db,self.log,self.src['id'],0,len(self.src['content']))

    def tearDown(self): self.t.cleanup()

    def ev(self): return [{'span_id':self.span['id'],'evidence_root':self.src['id'],'source_role':'supports'}]

    def test_evidence_guard(self):
        with self.assertRaises(ValueError): add_node(self.db,self.log,'CLM','No source')

    def test_search_trace_context(self):
        n=add_node(self.db,self.log,'CLM','Alpha claim',evidence=self.ev())
        hits=search(self.db,'Alpha')
        self.assertIn(n['id'],[h['object_id'] for h in hits])
        tr=trace_node(self.db,n['id'])
        self.assertEqual(tr['evidence'][0]['source_id'],self.src['id'])
        cp=context_packet(self.db,'Alpha')
        self.assertTrue(cp['items'])

    def test_contradiction_and_open(self):
        a=add_node(self.db,self.log,'CLM','Alpha true',evidence=self.ev())
        b=add_node(self.db,self.log,'CLM','Alpha false',evidence=self.ev())
        add_relation(self.db,self.log,a['id'],'CONTRADICTS',b['id'])
        add_node(self.db,self.log,'QST','What now?',status='open')
        self.assertEqual(len(contradictions(self.db)),1)
        self.assertEqual(len(open_loops(self.db)),1)


    def test_replay(self):
        n=add_node(self.db,self.log,'CLM','Alpha claim',evidence=self.ev())
        before=trace_node(self.db,n['id'])
        out=rebuild_from_log(self.db,self.log)
        after=trace_node(self.db,n['id'])
        self.assertGreater(out['replayed_events'],0)
        self.assertEqual(before['node']['text'],after['node']['text'])
        self.assertEqual(before['evidence'][0]['exact_text'],after['evidence'][0]['exact_text'])

    def test_validate(self):
        add_node(self.db,self.log,'DEC','Beta decision',evidence=self.ev())
        self.assertTrue(validate(self.db)['ok'])

if __name__=='__main__': unittest.main()
