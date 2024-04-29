import json
from flask import Blueprint, render_template, url_for, redirect, request
from .model import collect_attestations, collect_coordinated_attestations, process_attestations, process_coordinated_attestations, process_coattestations, create_attestations_table

views = Blueprint('views', __name__)

@views.route('/', methods=['GET', 'POST'])
def search():
    if request.method == 'POST':
        term = request.form['term']
        time_periods = request.form.getlist('timePeriod')
        origins = request.form.getlist('origin')
        distinguish_variants = bool(request.form.get('distinguish_variants'))
        dismantle = bool(request.form.get('dismantle'))
        atomize = bool(request.form.get('atomize'))

        # splitting
        parts = term.split(', ')
        term = [[item.strip() for item in part.split()] for part in parts]

        query_params = {
            'term': term,
            'timePeriod': ','.join(time_periods),
            'origin': ','.join(origins),
            'distinguish_variants': distinguish_variants,
            'dismantle': dismantle,
            'atomize': atomize
        }

        if len(term) == 1:
            return redirect(url_for('views.search_results', **query_params))
        else:
            return redirect(url_for('views.coordinated', **query_params))

    return render_template('index.html')

@views.route('/search-results')
def search_results():
    term = json.loads(request.args.get('term').replace("'", '"'))

    time_periods = request.args.get('timePeriod', '').split(',') if request.args.get('timePeriod', '') != '' else []
    origins = request.args.get('origin', '').split(',') if request.args.get('origin', '') != '' else []
    distinguish_variants = request.args.get('distinguish_variants')
    dismantle = request.args.get('dismantle')
    atomize = request.args.get('atomize')

    att = None
    att_list = None
    att_table = None

    coatt_list = None
    tab_coatt_list = None

    att, coatt, tab_coatt, matched_tablets = collect_attestations(term, time_periods, origins, distinguish_variants, dismantle, atomize)
    
    if att:
        att_list = process_attestations(term, att, dismantle)
        att_table = create_attestations_table(att)

    if coatt:
        coatt_list = process_coattestations(coatt, len(att))

    if tab_coatt:
        tab_coatt_list = process_coattestations(tab_coatt, len(matched_tablets))

    return render_template('search_results.html', 
                           queryTerm = ' '.join(term),
                           queryTable = att_table, 
                           queryCase = coatt_list,
                           queryTablet = tab_coatt_list,
                           queryCount = len(att), 
                           queryTabletCount = len(matched_tablets),
                           queryAttestations = att_list)

@views.route('/coordinated-search-results')
def coordinated():
    terms = request.args.getlist('term')
    terms = [json.loads(term.replace("'", '"')) for term in terms]

    time_periods = request.args.get('timePeriod', '').split(',') if request.args.get('timePeriod', '') != '' else []
    origins = request.args.get('origin', '').split(',') if request.args.get('origin', '') != '' else []
    distinguish_variants = request.args.get('distinguish_variants')
    dismantle = request.args.get('dismantle')
    atomize = request.args.get('atomize')

    att = None
    att_list = None
    att_table = None
    tab_coatt_list = None

    att, tab_coatt = collect_coordinated_attestations(terms, time_periods, origins, distinguish_variants, dismantle, atomize)

    if att:
        att_list = process_coordinated_attestations(terms, att, dismantle)
        att_table = create_attestations_table(att)

    if tab_coatt:
        tab_coatt_list = process_coattestations(tab_coatt, len(att))

    return render_template('coordinated_search_results.html',
                           queryTerm = ', '.join([' '.join(sublist) for sublist in terms]),
                           queryTable = att_table,
                           queryTablet = tab_coatt_list,
                           queryCount = len(att),
                           queryAttestations = att_list)

@views.route('/help')
def help():
    return render_template('help.html')

@views.route('/atomization')
def atomization():
    return render_template('atomization.html')