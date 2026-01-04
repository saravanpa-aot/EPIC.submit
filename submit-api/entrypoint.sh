#!/bin/bash
flask db upgrade && python3.12 wsgi.py
