"""
Demo seed data — 70 teachers (2 per cluster), ClusterItems enabled for all clusters,
item rates, and 6 months of historical fulfilled + 8 pending requests.

SAP IDs: 40000001–40000070 (clearly in demo range — easy to identify and remove)

To remove all demo data:  flask purge-demo
"""

DEMO_TEACHERS = [
    # (cluster_name, sap_id, display_name)
    ('SOE PETROLEUM',                 40000001, 'Dr. Rajesh Kumar'),
    ('SOE PETROLEUM',                 40000002, 'Prof. Sunita Sharma'),
    ('SOE AERO',                      40000003, 'Dr. Vikram Singh'),
    ('SOE AERO',                      40000004, 'Prof. Anita Mehta'),
    ('CHEMICAL',                      40000005, 'Dr. Pradeep Gupta'),
    ('CHEMICAL',                      40000006, 'Prof. Kavita Rao'),
    ('EEE',                           40000007, 'Dr. Arun Verma'),
    ('EEE',                           40000008, 'Prof. Pooja Nair'),
    ('APPLIED SC.',                   40000009, 'Dr. Manish Tiwari'),
    ('APPLIED SC.',                   40000010, 'Prof. Ritu Srivastava'),
    ('MECHANICAL',                    40000011, 'Dr. Sanjay Yadav'),
    ('MECHANICAL',                    40000012, 'Prof. Divya Pandey'),
    ('REGISTRAR OFFICE',              40000013, 'Mr. Harish Chandra'),
    ('REGISTRAR OFFICE',              40000014, 'Ms. Preeti Mishra'),
    ('HEALTH SCIENCE',                40000015, 'Dr. Neha Agarwal'),
    ('HEALTH SCIENCE',                40000016, 'Prof. Rohit Saxena'),
    ('SODS',                          40000017, 'Dr. Abhijit Das'),
    ('SODS',                          40000018, 'Prof. Swati Khanna'),
    ('HSE/ CIVIL',                    40000019, 'Dr. Girish Bhatt'),
    ('HSE/ CIVIL',                    40000020, 'Prof. Leela Iyer'),
    ('ACADEMIC PLANNING & STRATEGY',  40000021, 'Dr. Suresh Pillai'),
    ('ACADEMIC PLANNING & STRATEGY',  40000022, 'Prof. Anjali Joshi'),
    ('FINANCE',                       40000023, 'Mr. Dinesh Chauhan'),
    ('FINANCE',                       40000024, 'Ms. Renu Bansal'),
    ('VIRTUALIZATION',                40000025, 'Dr. Kiran Malhotra'),
    ('VIRTUALIZATION',                40000026, 'Prof. Deepa Reddy'),
    ('INFORMATICS',                   40000027, 'Dr. Pawan Tripathi'),
    ('INFORMATICS',                   40000028, 'Prof. Hema Shukla'),
    ('SYSTEMIC',                      40000029, 'Dr. Vinay Bhatia'),
    ('SYSTEMIC',                      40000030, 'Prof. Nisha Dubey'),
    ('CYBERNATICS',                   40000031, 'Dr. Amit Ghosh'),
    ('CYBERNATICS',                   40000032, 'Prof. Smita Kapoor'),
    ('ADMIN',                         40000033, 'Mr. Ramesh Goyal'),
    ('ADMIN',                         40000034, 'Ms. Sunita Mittal'),
    ('INTERNATIONAL DEPT.',           40000035, 'Dr. Siddharth Rao'),
    ('INTERNATIONAL DEPT.',           40000036, 'Prof. Priya Mathur'),
    ('R&D',                           40000037, 'Dr. Nitin Jain'),
    ('R&D',                           40000038, 'Prof. Meenakshi Pal'),
    ('LIBRARY',                       40000039, 'Mr. Vivek Sharma'),
    ('LIBRARY',                       40000040, 'Ms. Asha Sinha'),
    ('ENROLLMENT',                    40000041, 'Mr. Rajan Kulkarni'),
    ('ENROLLMENT',                    40000042, 'Ms. Geeta Patil'),
    ('HR',                            40000043, 'Ms. Nandita Bose'),
    ('HR',                            40000044, 'Mr. Sandeep Chaudhary'),
    ('PR MARKETING',                  40000045, 'Ms. Pallavi Seth'),
    ('PR MARKETING',                  40000046, 'Mr. Varun Arora'),
    ('MARKETING',                     40000047, 'Ms. Roshni Menon'),
    ('MARKETING',                     40000048, 'Mr. Anand Tiwari'),
    ('LEGAL',                         40000049, 'Mr. Raghav Garg'),
    ('LEGAL',                         40000050, 'Ms. Seema Bajaj'),
    ('CSR',                           40000051, 'Ms. Tanvi Desai'),
    ('CSR',                           40000052, 'Mr. Mukesh Verma'),
    ('CAREER SERVICES',               40000053, 'Ms. Shruti Naik'),
    ('CAREER SERVICES',               40000054, 'Mr. Ashok Pillai'),
    ('CHANCERY',                      40000055, 'Mr. Sunil Bhatt'),
    ('CHANCERY',                      40000056, 'Ms. Lalita Misra'),
    ('DSW / SEE',                     40000057, 'Mr. Prakash Dixit'),
    ('DSW / SEE',                     40000058, 'Ms. Usha Sood'),
    ('OUTREACH',                      40000059, 'Ms. Neeraj Singh'),
    ('OUTREACH',                      40000060, 'Mr. Vinod Kumar'),
    ('PURCHASE',                      40000061, 'Mr. Satish Goel'),
    ('PURCHASE',                      40000062, 'Ms. Deepika Sharma'),
    ('IQAC',                          40000063, 'Dr. Arvind Kaul'),
    ('IQAC',                          40000064, 'Prof. Shobha Mehta'),
    ('RUNWAY',                        40000065, 'Mr. Tarun Kapila'),
    ('RUNWAY',                        40000066, 'Ms. Prachi Agarwal'),
    ('SRE',                           40000067, 'Mr. Hemant Rawat'),
    ('SRE',                           40000068, 'Ms. Kaveri Nair'),
    ('IT',                            40000069, 'Mr. Gaurav Srivastava'),
    ('IT',                            40000070, 'Ms. Pooja Choudhary'),
]

DEMO_SAP_IDS = [str(t[1]) for t in DEMO_TEACHERS]

ITEM_RATES = {
    'Pen (Ball Point)':              12.0,
    'Pen — Trimax / Reynolds':  18.0,
    'Pen — Pilot / Flair / Captain': 22.0,
    'Pen — Gel (Uniball / Racer)':   35.0,
    'Parker Pen':                   150.0,
    'Pencil':                         8.0,
    'Sketch Pen / Color Pen':        95.0,
    'Highlighter':                   45.0,
    'OHP Marker':                    65.0,
    'Whiteboard Marker':             55.0,
    'Permanent Marker':              40.0,
    'Marker Ink (Refill)':           35.0,
    'A4 Paper Ream (70/75 GSM)':    290.0,
    'A3 Paper Ream':                420.0,
    'Bond Paper (85 GSM)':          180.0,
    'Bond Paper (100 GSM)':         220.0,
    'Coloured Paper A4':            120.0,
    'Chart Paper':                   15.0,
    'Carbon Paper':                  80.0,
    'Glossy Paper':                   8.0,
    'Graph Paper':                   60.0,
    'A4 Label Stickers':             75.0,
    'Notepad / Conference Pad':      40.0,
    'Sticky Notes':                  55.0,
    'Page Markers / Flags':          45.0,
    'Index File (Blue)':             35.0,
    'L-Folder':                      28.0,
    'Button File / Folder':          32.0,
    'Cobra File':                    85.0,
    'Sheet Protector':               65.0,
    'Cello Tape 1"':                 22.0,
    'Cello Tape 2"':                 35.0,
    'Brown Tape 2"':                 28.0,
    'Double-Sided Tape (12mm)':      45.0,
    'Glue Stick':                    38.0,
    'Gum Bottle / Fevicol':          55.0,
    'Binder Clip 32mm':              30.0,
    'Binder Clip 51mm':              40.0,
    'Stapler Pin (No.10)':           20.0,
    'Stapler Pin 24/6':              25.0,
    'Push Pin / Drawing Pin':        18.0,
    'Rubber Band':                   30.0,
    'Stapler (Small / No.10)':       95.0,
    'Punch Machine':                180.0,
    'Paper Cutter / Blade':          45.0,
    'Scissors (Small)':              55.0,
    'Correction Pen':                35.0,
    'Correction Fluid (Whitener)':   28.0,
    'Eraser':                        10.0,
    'Sharpener':                     15.0,
    'Register (Soft Cover)':         75.0,
    'Register (Hard Cover)':        130.0,
    'Attendance Register':          110.0,
    'Stock Register':               160.0,
    'Scale (12")':                   40.0,
    'Stamp Pad':                     85.0,
    'Duster (Board)':                70.0,
    'Envelopes A4':                  55.0,
    'Notepad (Spiral)':              65.0,
}


def seed_demo(db):
    """
    Seeds demo teachers, cluster-item enablement, item rates, and historical requests.
    Safe to call multiple times — checks if already seeded before writing.
    """
    import random
    from datetime import datetime, timezone, timedelta, date as date_type
    from app.models import (
        Teacher, Cluster, ClusterItem, StationaryItem,
        Stock, StockIn, StockInBatch, Request, RequestLine, Receptionist
    )

    if Teacher.query.filter_by(sap_id='40000001').first():
        return  # already seeded

    rng = random.Random(42)  # deterministic so reruns produce identical data

    clusters = Cluster.query.all()
    items = StationaryItem.query.all()
    admin = Receptionist.query.filter_by(role='admin').first()
    now = datetime.now(timezone.utc)

    # 1. Enable all items for every cluster
    for cluster in clusters:
        for item in items:
            existing = ClusterItem.query.filter_by(
                cluster_id=cluster.id, item_id=item.id
            ).first()
            if existing:
                existing.is_enabled = True
            else:
                db.session.add(ClusterItem(
                    cluster_id=cluster.id, item_id=item.id, is_enabled=True
                ))
    db.session.flush()

    # 2. Stock-in batch with rates (so cost calculations in reports work)
    six_months_ago = now - timedelta(days=180)
    batch = StockInBatch(
        uploaded_by=admin.id if admin else None,
        uploaded_at=six_months_ago,
        vendor_name='Demo Vendor',
        invoice_ref='DEMO-INV-001',
        source='manual',
        confirmed_at=six_months_ago,
    )
    db.session.add(batch)
    db.session.flush()

    for item in items:
        rate = ITEM_RATES.get(item.name, 50.0)
        db.session.add(StockIn(
            batch_id=batch.id,
            item_id=item.id,
            quantity_received=300,
            rate_per_unit=rate,
            received_date=six_months_ago.date(),
            notes='Demo seed — opening stock',
        ))
    db.session.flush()

    # 3. Demo teachers
    cluster_map = {c.name: c for c in clusters}
    for cluster_name, sap_id, name in DEMO_TEACHERS:
        cluster = cluster_map.get(cluster_name)
        if not cluster:
            continue
        db.session.add(Teacher(
            sap_id=str(sap_id),
            name=name,
            cluster_id=cluster.id,
        ))
    db.session.flush()

    # Build a lookup: cluster_id -> list of Teacher objects
    demo_teachers_db = Teacher.query.filter(
        Teacher.sap_id.in_(DEMO_SAP_IDS)
    ).all()
    cluster_teacher_map = {}
    for t in demo_teachers_db:
        cluster_teacher_map.setdefault(t.cluster_id, []).append(t)

    all_items = list(items)

    # 4. Historical fulfilled requests — past 6 months (3–5 per cluster per month)
    counter = [1]

    def next_ref():
        r = f'DEMO-{counter[0]:04d}'
        counter[0] += 1
        return r

    for month_offset in range(6, 0, -1):
        base_dt = now - timedelta(days=month_offset * 30)
        yr, mo = base_dt.year, base_dt.month

        for cluster in clusters:
            teachers_in_cluster = cluster_teacher_map.get(cluster.id, [])
            if not teachers_in_cluster:
                continue

            for _ in range(rng.randint(3, 5)):
                teacher = rng.choice(teachers_in_cluster)
                n_items = rng.randint(1, 4)
                chosen = rng.sample(all_items, min(n_items, len(all_items)))

                day = rng.randint(1, 28)
                req_dt = datetime(yr, mo, day, rng.randint(9, 16), rng.randint(0, 59),
                                  tzinfo=timezone.utc)

                req = Request(
                    ref_number=next_ref(),
                    teacher_id=teacher.id,
                    status='fulfilled',
                    is_manual=False,
                    is_cap_override=False,
                    created_at=req_dt,
                    fulfilled_at=req_dt + timedelta(hours=rng.randint(1, 3)),
                    fulfilled_by=admin.id if admin else None,
                )
                db.session.add(req)
                db.session.flush()

                for item in chosen:
                    cap = item.per_checkout_cap or 3
                    qty = rng.randint(1, cap)
                    db.session.add(RequestLine(
                        request_id=req.id,
                        item_id=item.id,
                        quantity_requested=qty,
                        quantity_fulfilled=qty,
                    ))

    # 5. A handful of pending requests so the dashboard has live data to show
    for _ in range(8):
        all_demo = demo_teachers_db
        teacher = rng.choice(all_demo)
        n_items = rng.randint(1, 3)
        chosen = rng.sample(all_items, min(n_items, len(all_items)))

        req = Request(
            ref_number=next_ref(),
            teacher_id=teacher.id,
            status='pending',
            is_manual=False,
            is_cap_override=False,
            created_at=now - timedelta(hours=rng.randint(1, 36)),
        )
        db.session.add(req)
        db.session.flush()

        for item in chosen:
            cap = item.per_checkout_cap or 3
            qty = rng.randint(1, cap)
            db.session.add(RequestLine(
                request_id=req.id,
                item_id=item.id,
                quantity_requested=qty,
                quantity_fulfilled=None,
            ))

    db.session.commit()
    print(f'[demo] Seeded {len(demo_teachers_db)} teachers across {len(clusters)} clusters.')


def top_up_demo_current_month(db):
    """
    Adds fulfilled requests for the current calendar month if none exist yet.
    Safe to call on every startup — skips if current-month data already present.
    """
    import random
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import extract
    from app.models import Teacher, Cluster, StationaryItem, Request, RequestLine, Receptionist

    now = datetime.now(timezone.utc)
    yr, mo = now.year, now.month

    demo_teachers = Teacher.query.filter(Teacher.sap_id.in_(DEMO_SAP_IDS)).all()
    if not demo_teachers:
        return  # full seed hasn't run yet

    teacher_ids = [t.id for t in demo_teachers]
    already = (
        Request.query
        .filter(
            Request.teacher_id.in_(teacher_ids),
            Request.status == 'fulfilled',
            extract('year', Request.fulfilled_at) == yr,
            extract('month', Request.fulfilled_at) == mo,
        )
        .count()
    )
    if already > 0:
        return  # current month already has data

    # Find highest existing DEMO ref number to avoid collisions
    from app.models import Request as Req
    last_demo = (
        Req.query
        .filter(Req.ref_number.like('DEMO-%'))
        .order_by(Req.id.desc())
        .first()
    )
    try:
        counter = [int(last_demo.ref_number.split('-')[1]) + 1] if last_demo else [9000]
    except (IndexError, ValueError):
        counter = [9000]

    def next_ref():
        r = f'DEMO-{counter[0]:04d}'
        counter[0] += 1
        return r

    rng = random.Random(yr * 100 + mo)  # deterministic per month
    admin = Receptionist.query.filter_by(role='admin').first()
    clusters = Cluster.query.all()
    all_items = StationaryItem.query.all()

    cluster_teacher_map = {}
    for t in demo_teachers:
        cluster_teacher_map.setdefault(t.cluster_id, []).append(t)

    for cluster in clusters:
        teachers_in_cluster = cluster_teacher_map.get(cluster.id, [])
        if not teachers_in_cluster:
            continue
        for _ in range(rng.randint(3, 5)):
            teacher = rng.choice(teachers_in_cluster)
            chosen = rng.sample(list(all_items), min(rng.randint(1, 4), len(all_items)))
            day = rng.randint(1, min(now.day, 28))
            req_dt = datetime(yr, mo, day, rng.randint(9, 16), rng.randint(0, 59),
                              tzinfo=timezone.utc)
            req = Request(
                ref_number=next_ref(),
                teacher_id=teacher.id,
                status='fulfilled',
                is_manual=False,
                is_cap_override=False,
                created_at=req_dt,
                fulfilled_at=req_dt + timedelta(hours=rng.randint(1, 3)),
                fulfilled_by=admin.id if admin else None,
            )
            db.session.add(req)
            db.session.flush()
            for item in chosen:
                cap = item.per_checkout_cap or 3
                qty = rng.randint(1, cap)
                db.session.add(RequestLine(
                    request_id=req.id,
                    item_id=item.id,
                    quantity_requested=qty,
                    quantity_fulfilled=qty,
                ))

    db.session.commit()
    print(f'[demo] Topped up current month ({yr}-{mo:02d}) with fulfilled requests.')


def purge_demo(db):
    """Remove all demo data. Called by the `flask purge-demo` CLI command."""
    from app.models import Teacher, Request, StockInBatch

    demo_teachers = Teacher.query.filter(
        Teacher.sap_id.in_(DEMO_SAP_IDS)
    ).all()

    teacher_ids = [t.id for t in demo_teachers]
    removed_requests = 0

    if teacher_ids:
        demo_reqs = Request.query.filter(
            Request.teacher_id.in_(teacher_ids)
        ).all()
        removed_requests = len(demo_reqs)
        for r in demo_reqs:
            db.session.delete(r)
        for t in demo_teachers:
            db.session.delete(t)

    demo_batch = StockInBatch.query.filter_by(
        vendor_name='Demo Vendor', invoice_ref='DEMO-INV-001'
    ).first()
    if demo_batch:
        db.session.delete(demo_batch)

    db.session.commit()
    print(f'[demo] Purged {len(demo_teachers)} teachers, '
          f'{removed_requests} requests, '
          f'{"1 stock-in batch" if demo_batch else "0 stock-in batches"}.')
