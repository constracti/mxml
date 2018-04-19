/*
 * part.id  . . . . . . . . . . . . . . . String
 * part.xml . . . . . . . . . . . . . . . XMLDocument
 * part.name  . . . . . . . . . . . . . . String
 * part.abbreviation  . . . . . . . . . . String
 * part.key . . . . . . . . . . . . . . . String
 * part.time  . . . . . . . . . . . . . . String
 * part.staves  . . . . . . . . . . . . . Array
 * part.staves[].vf_stave . . . . . . . . Vex.Flow.Stave
 * part.staves[].clef.type  . . . . . . . String
 * part.staves[].clef.annotation  . . . . String
 * part.staves[].clef.octave_shift  . . . int
 * part.staves[].voices . . . . . . . . . Object
 * part.staves[].voices[].id  . . . . . . String
 * part.staves[].voices[].vf_voice  . . . Vex.Flow.Voice
 * part.staves[].voices[].beam  . . . . . Array
 * part.staves[].voices[].beam[]  . . . . Vex.Flow.StaveNote
 * part.staves[].voices[].ties  . . . . . Object
 * part.staves[].voices[].ties[].vf_note  Vex.Flow.StaveNote
 * part.staves[].voices[].ties[].line . . int
 * part.staves[].voices[].ties[].index  . int
 * part.staves[].harmony  . . . . . . . . String
 * part.measures  . . . . . . . . . . . . int
 * part.vf_connectors . . . . . . . . . . Array
 * part.vf_connectors[] . . . . . . . . . Vex.Flow.StaveConnector
 * part.vf_beams  . . . . . . . . . . . . Array
 * part.vf_beams[]  . . . . . . . . . . . Vex.Flow.Beam
 * part.vf_ties . . . . . . . . . . . . . Array
 * part.vf_ties[] . . . . . . . . . . . . Vex.Flow.StaveTie
 */

mxmlResponses = {};

function mxmlLoad( containerId, onLoad ) {
	let container = document.getElementById( containerId );
	let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if ( this.readyState === 4 && this.status === 200 ) {
			mxmlResponses[containerId] = this.responseXML;
			onLoad();
		}
	};
	xhttp.open( 'GET', container.dataset.mxmlUrl, true );
	xhttp.send();
}

function mxmlRender( containerId, options = {} ) {
	var xml = mxmlResponses[containerId];
	var container = document.getElementById( containerId );
	var renderer = container.dataset.mxmlRenderer;
	if ( renderer !== undefined )
		renderer = document.getElementById( renderer );
	else
		renderer = container;
	renderer.innerHTML = '';
	if ( !( 'LINE_WIDTH' in options ) )
		options.LINE_WIDTH = renderer.offsetWidth - 20;
	renderer = new Vex.Flow.Renderer( renderer.id, Vex.Flow.Renderer.Backends.SVG );
	var context = renderer.getContext();

	if ( !( 'STAVE_WIDTH' in options ) )
		options.STAVE_WIDTH = 240;
	if ( !( 'STAVE_HEIGHT' in options ) )
		options.STAVE_HEIGHT = 100;
	if ( !( 'STAVE_MARGIN' in options ) )
		options.STAVE_MARGIN = 0;
	if ( !( 'PART_MARGIN' in options ) )
		options.PART_MARGIN = 20;
	if ( !( 'LINE_MARGIN' in options ) )
		options.LINE_MARGIN = 40;
	if ( !( 'visibleParts' in options ) )
		options.visibleParts = undefined;
	if ( !( 'displayPartNames' in options ) )
		options.displayPartNames = true;

	var score_partwise = xml.getElementsByTagName( 'score-partwise' )[0];
	var part_list = score_partwise.getElementsByTagName( 'part-list' )[0];
	var score_parts = part_list.getElementsByTagName( 'score-part' );
	// TODO part-group group-symbol (bracket)

	// initialize parts array
	var parts = [];
	var measures = 0;
	for ( let xml_part of score_partwise.getElementsByTagName( 'part' ) ) {
		if ( options.visibleParts !== undefined && options.visibleParts.indexOf( xml_part.id ) === -1 )
			continue;
		let part = {
			id: xml_part.id,
			xml: xml_part,
			key: null,
			time: null,
			staves: [],
			measures: xml_part.getElementsByTagName( 'measure' ).length,
			getStave: function( index ) {
				if ( index < 0 )
					index += this.staves.length;
				return this.staves[index];
			},
			vf_connectors: [],
			vf_beams: [],
			vf_ties: [],
		};
		if ( options.displayPartNames ) {
			part.name = score_parts[part.id].getElementsByTagName( 'part-name' )[0].innerHTML;
			part.abbreviation = score_parts[part.id].getElementsByTagName( 'part-abbreviation' )[0].innerHTML;
		}
		if ( measures === 0 )
			measures = part.measures;
		else if ( part.measures < measures )
			measures = part.measures;
		parts.push( part );
	}
	if ( !( 'LINE_INDENT' in options ) )
		options.LINE_INDENT = options.displayPartNames ? 200 : 20;

	var state = {
		x: options.LINE_INDENT,
		y: 20,
		top: 20,
		line_cnt: 0,
		part_cnt: 0,
	};

	for ( let i = 0; i < measures; i++ ) {
		// calculate horizontal position
		if ( state.x > options.LINE_INDENT && state.x + options.STAVE_WIDTH > options.LINE_WIDTH ) {
			state.line_cnt++;
			state.x = options.LINE_INDENT;
			state.top = state.y;
		} else {
			state.y = state.top;
		}
		// loop each part
		for ( state.part_cnt = 0; state.part_cnt < parts.length; state.part_cnt++ ) {
			// shorthand to current part
			let part = parts[state.part_cnt];
			// build part staves in case they are initialized
			if ( part.staves.length )
				mxmlPartStaves( part, options, state );
			// loop each measure element
			for ( let element of part.xml.getElementsByTagName( 'measure' )[i].children ) {
				// TODO direction: metronome and dynamics
				if ( element.tagName === 'attributes' ) {
					// build part staves in case they are not initialized
					if ( !part.staves.length ) {
						if ( element.getElementsByTagName( 'staves' ).length )
							part.staves = new Array( parseInt( element.getElementsByTagName( 'staves' )[0].innerHTML ) );
						else
							part.staves = new Array( 1 );
						mxmlPartStaves( part, options, state );
					}
					// add clef to staves
					for ( let xml_clef of element.getElementsByTagName( 'clef' ) ) {
						let stave_cnt = xml_clef.getAttribute( 'number' );
						if ( stave_cnt !== null )
							stave_cnt = parseInt( stave_cnt ) - 1;
						else
							stave_cnt = 0;
						let stave = part.staves[stave_cnt];
						stave.clef = mxmlClef( xml_clef );
						mxmlStaveAddClef( stave );
					}
					// add key signature to staves
					if ( element.getElementsByTagName( 'key' ).length ) {
						part.key = mxmlKey( element.getElementsByTagName( 'key' )[0] );
						for ( let stave of part.staves )
							stave.vf_stave.addKeySignature( part.key );
					}
					// add time signature to staves
					if ( element.getElementsByTagName( 'time' ).length ) {
						part.time = mxmlTime( element.getElementsByTagName( 'time' )[0] );
						for ( let stave of part.staves )
							stave.vf_stave.addTimeSignature( part.time );
					}
				} else if ( element.tagName === 'barline' ) {
					let location = element.getAttribute( 'location' );
					if ( location === null )
						location = 'right';
					let bar_style = element.getElementsByTagName( 'bar-style' )[0].innerHTML;
					if ( part.staves.length > 1 ) {
						let type = mxmlBarLineConnectorType( location, bar_style );
						let connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
						connector.setType( type );
						part.vf_connectors.push( connector );
					} else if ( part.staves.length === 1 ) {
						let type = mxmlBarType( bar_style );
						switch ( location ) {
							case 'right':
								part.getStave(0).vf_stave.setEndBarType( type );
								break;
							case 'left':
								part.getStave(0).vf_stave.setBegBarType( type );
								break;
							case 'middle':
								break;
						}
					}
				} else if ( element.tagName === 'harmony' ) {
					let stave = part.staves[0];
					stave.harmony = mxmlHarmony( element );
				} else if ( element.tagName === 'note' ) {
					if ( element.getElementsByTagName( 'chord' ).length )
						continue;
					// stave
					let stave_cnt = element.getElementsByTagName( 'staff' );
					if ( stave_cnt.length )
						stave_cnt = parseInt( stave_cnt[0].innerHTML ) - 1;
					else
						stave_cnt = 0;
					let stave = part.staves[stave_cnt];
					// voice
					let voice = element.getElementsByTagName( 'voice' )[0].innerHTML;
					if ( !( voice in stave.voices ) )
						stave.voices[voice] = {
							id: voice,
							vf_voice: null,
							beam: [],
							ties: {},
						};
					voice = stave.voices[voice];
					if ( voice.vf_voice === null )
						voice.vf_voice = new Vex.Flow.Voice( part.time );
					// note struct and object
					let note = {};
					let vf_note;
					// duration
					if ( element.getElementsByTagName( 'type' ).length ) {
						note.duration = mxmlDuration( element.getElementsByTagName( 'type' )[0].innerHTML );
						note.align_center = false;
					} else {
						note.duration = mxmlDuration();
						note.align_center = true;
						voice.vf_voice.setStrict( false );
					}
					// dots
					note.dots = element.getElementsByTagName( 'dot' ).length;
					// stem
					if ( element.getElementsByTagName( 'stem' ).length ) {
						let stem = element.getElementsByTagName( 'stem' )[0].innerHTML;
						if ( stem === 'up' )
							note.stem_direction = Vex.Flow.Stem.UP;
						else if ( stem === 'down' )
							note.stem_direction = Vex.Flow.Stem.DOWN;
						else if ( stem === 'double' )
							;
					}
					if ( element.getElementsByTagName( 'rest' ).length ) {
						note.duration += 'r';
						note.keys = [ 'r/4' ];
						vf_note = new Vex.Flow.StaveNote( note );
					} else {
						note.clef = stave.clef.type;
						note.octave_shift = stave.clef.octave_shift;
						note.keys = [];
						let accidentals = [];
						let sibling = element;
						let index = 0;
						do {
							let pitch = mxmlPitch( sibling.getElementsByTagName( 'pitch' )[0] );
							note.keys.push( pitch.step + '/' + pitch.octave );
							let xml_accidentals = sibling.getElementsByTagName( 'accidental' );
							if ( xml_accidentals.length )
								accidentals.push( {
									index: index,
									type: mxmlAccidentalType( xml_accidentals[0] ),
								} );
							sibling = sibling.nextElementSibling;
							index++;
						} while ( sibling !== null && sibling.getElementsByTagName( 'chord' ).length );
						vf_note = new Vex.Flow.StaveNote( note );
						for ( let accidental of accidentals )
							vf_note.addAccidental( accidental.index, new Vex.Flow.Accidental( accidental.type ) );
					}
					// beam
					mxmlBeam( element, part, voice, vf_note );
					// tie
					mxmlTie( element, part, voice, vf_note, state.line_cnt );
					// lyric
					if ( element.getElementsByTagName( 'lyric' ).length ) {
						let text = element.getElementsByTagName( 'lyric' )[0].getElementsByTagName( 'text' )[0].innerHTML;
						let syllabic = element.getElementsByTagName( 'lyric' )[0].getElementsByTagName( 'syllabic' )[0].innerHTML;
						if ( syllabic === 'begin' || syllabic === 'middle' )
							text += ' -';
						else if ( syllabic === 'end' || syllabic === 'single' )
							;
						var annotation = new Vex.Flow.Annotation( text );
						annotation.setVerticalJustification( Vex.Flow.Annotation.VerticalJustify.BOTTOM );
						vf_note.addAnnotation( 0, annotation );
						// TODO vertical justify to the minimum height of the line
					}
					// TODO multiple lyrics
					// dots
					for ( let dot = 0; dot < note.dots; dot++ )
						vf_note.addDotToAll();
					//
					voice.vf_voice.addTickable( vf_note );
					// harmony
					if ( stave_cnt === 0 && parseInt( voice.id ) === 1 ) {
						voice = 'harmony';
						if ( !( voice in stave.voices ) )
							stave.voices[voice] = {
								id: 'harmony',
								vf_voice: null,
								beam: [],
								ties: {},
							};
						voice = stave.voices[voice];
						if ( voice.vf_voice === null )
							voice.vf_voice = new Vex.Flow.Voice( part.time );
						if ( note.align_center )
							voice.vf_voice.setStrict( false );
						note = {
							duration: note.duration,
							dots: note.dots,
						};
						if ( stave.harmony !== null ) {
							note.text = stave.harmony;
							stave.harmony = null;
						} else {
							note.text = '';
						}
						vf_note = new Vex.Flow.TextNote( note );
						vf_note.setContext( context );
						voice.vf_voice.addTickable( vf_note );
					}
				}
			}
		}
		renderer.resize( options.LINE_WIDTH, state.y ); // TODO delete line
		for ( let part of parts ) {
			for ( let stave of part.staves )
				stave.vf_stave.setContext( context ).draw();
			for ( let vf_connector of part.vf_connectors )
				vf_connector.setContext( context ).draw();
			part.vf_connectors = [];
		}
		for ( let strict of [ true, false ] ) {
			let vf_voices = [];
			for ( let part of parts ) {
				for ( let stave of part.staves ) {
					for ( let voice_id in stave.voices ) {
						let voice = stave.voices[voice_id];
						if ( voice.vf_voice !== null && ( voice.vf_voice.mode === Vex.Flow.Voice.Mode.STRICT ) === strict )
							vf_voices.push( voice.vf_voice );
					}
				}
			}
			if ( vf_voices.length )
				new Vex.Flow.Formatter().joinVoices( vf_voices ).formatToStave( vf_voices, parts[0].staves[0].vf_stave );
			vf_voices = [];
		}
		for ( let part of parts ) {
			for ( let stave of part.staves ) {
				for ( let voice_id in stave.voices ) {
					let voice = stave.voices[voice_id];
					if ( voice.vf_voice !== null ) {
						voice.vf_voice.draw( context, stave.vf_stave );
						voice.vf_voice = null;
					}
				}
				stave.vf_stave = null;
			}
		}
		for ( let part of parts ) {
			for ( let vf_beam of part.vf_beams )
				vf_beam.setContext( context ).draw();
			part.vf_beams = [];
			for ( let vf_tie of part.vf_ties )
				vf_tie.setContext( context ).draw();
			part.vf_ties = [];
		}
		state.x += options.STAVE_WIDTH;
	}
	
	renderer.resize( options.LINE_WIDTH, state.y + options.LINE_MARGIN );
}

function mxmlPartStaves( part, options, state ) {
	// stave options
	var stave_options = {};
	if ( part.staves.length > 1 ) {
		stave_options.left_bar = false;
		stave_options.right_bar = false;
	}
	for ( let stave_cnt = 0; stave_cnt < part.staves.length; stave_cnt++ ) {
		// stave vertical position
		if ( stave_cnt )
			state.y += options.STAVE_MARGIN;
		else if ( state.part_cnt )
			state.y += options.PART_MARGIN;
		else if ( state.line_cnt )
			state.y += options.LINE_MARGIN;
		else
			state.y = state.top;
		// create stave if it does not exist
		if ( !( stave_cnt in part.staves ) )
			part.staves[stave_cnt] = {
				vf_stave: null,
				clef: null,
				voices: {},
				harmony: null,
			};
		// shorthand to current stave
		let stave = part.staves[stave_cnt];
		// create vf_stave
		stave.vf_stave = new Vex.Flow.Stave( state.x, state.y, options.STAVE_WIDTH, stave_options );
		// add clef and key signature to the first stave of each line
		if ( state.x === options.LINE_INDENT && stave.clef !== null )
			mxmlStaveAddClef( stave );
		if ( state.x === options.LINE_INDENT && part.key !== null )
			stave.vf_stave.addKeySignature( part.key );
		// move state.y to the bottom of the current stave
		state.y += options.STAVE_HEIGHT;
	}
	// add vertical part lines
	if ( part.staves.length > 1 ) {
		let connector;
		connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
		connector.setType( Vex.Flow.StaveConnector.type.SINGLE_LEFT );
		part.vf_connectors.push( connector );
		connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
		connector.setType( Vex.Flow.StaveConnector.type.SINGLE_RIGHT );
		part.vf_connectors.push( connector );
	}
	// add a brace connector
	var brace_connector;
	if ( state.x === options.LINE_INDENT && part.staves.length > 1 ) {
		brace_connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
		brace_connector.setType( Vex.Flow.StaveConnector.type.BRACE );
		part.vf_connectors.push( brace_connector );
	}
	// set part left text
	if ( state.x === options.LINE_INDENT && options.displayPartNames ) {
		let text = state.line_cnt ? part.abbreviation : part.name;
		if ( part.staves.length === 1 )
			part.getStave(0).vf_stave.setText( text, Vex.Flow.Modifier.Position.LEFT );
		else
			brace_connector.setText( text, Vex.Flow.Modifier.Position.LEFT );
	}
}

function mxmlClef( xml_clef ) {
	let type = mxmlClefType( xml_clef );
	let octave_shift = mxmlClefOctaveShift( xml_clef );
	let annotation = mxmlClefAnnotation( octave_shift );
	return {
		type: type,
		annotation: annotation,
		octave_shift: octave_shift,
	};
}

function mxmlClefType( xml_clef ) {
	let sign = xml_clef.getElementsByTagName( 'sign' )[0].innerHTML;
	let line = xml_clef.getElementsByTagName( 'line' );
	if ( line.length )
		line = line[0].innerHTML;
	else
		line = '';
	// TAB, jianpu, none clefs not present in Vex.Flow.clefProperties.values
	switch ( sign + line ) {
		case 'G1':
			return 'french';
		case 'G2':
			return 'treble';
		case 'C1':
			return 'soprano';
		case 'C2':
			return 'mezzo-soprano';
		case 'C3':
			return 'alto';
		case 'C4':
			return 'tenor';
		case 'C5':
			return 'baritone-c';
		case 'F3':
			return 'baritone-f';
		case 'F4':
			return 'bass';
		case 'F5':
			return 'subbass';
		case 'percussion':
			return 'percussion';
	}
}

function mxmlClefOctaveShift( xml_clef ) {
	let octave_change = xml_clef.getElementsByTagName( 'clef-octave-change' );
	if ( octave_change.length )
		return parseInt( octave_change[0].innerHTML );
	return 0;
}

function mxmlClefAnnotation( octave_shift ) {
	switch ( octave_shift ) {
		case -2:
			return '15vb';
		case -1:
			return '8vb';
		case 1:
			return '8va';
		case -2:
			return '15va';
	}
}

function mxmlStaveAddClef( stave ) {
	try {
		// Vex.Flow.Clef.annotations[].sizes[].attachments[] is not complete
		stave.vf_stave.addClef( stave.clef.type, undefined, stave.clef.annotation );
	} catch ( error ) {
		if ( error instanceof TypeError )
			stave.vf_stave.addClef( stave.clef.type, undefined, undefined );
		else
			throw error;
	}
}

function mxmlKey( xml_key ) {
	let fifths = parseInt( xml_key.getElementsByTagName( 'fifths' )[0].innerHTML );
	for ( let key in Vex.Flow.keySignature.keySpecs ) {
		let keyspec = Vex.Flow.keySignature.keySpecs[key];
		if ( fifths >= 0 && keyspec.acc !== 'b' && keyspec.num === fifths )
			return key;
		if ( fifths < 0 && keyspec.acc === 'b' && -keyspec.num === fifths )
			return key;
	}
}

function mxmlTime( xml_time ) {
	let symbol = xml_time.getAttribute( 'symbol' );
	switch ( symbol ) {
		case 'common':
			return 'C';
		case 'cut':
			return 'C|';
	}
	let beats = xml_time.getElementsByTagName( 'beats' )[0].innerHTML;
	let beat_type = xml_time.getElementsByTagName( 'beat-type' )[0].innerHTML;
	return beats + '/' + beat_type;
}

function mxmlBarType( bar_style ) {
	switch ( bar_style ) {
		case 'regular':
		case 'dotted':
		case 'dashed':
		case 'heavy':
			return Vex.Flow.Barline.type.SINGLE;
		case 'light-light':
		case 'heavy-light':
			return Vex.Flow.Barline.type.DOUBLE;
		case 'light-heavy':
		case 'heavy-heavy':
			return Vex.Flow.Barline.type.END;
		case 'tick':
		case 'short':
		default:
			return Vex.Flow.Barline.type.NONE;
	}
	// TODO repeats
	// Vex.Flow.Barline.type.REPEAT_BEGIN;
	// Vex.Flow.Barline.type.REPEAT_END;
	// Vex.Flow.Barline.type.REPEAT_BOTH;
}

function mxmlBarLineConnectorType( location, bar_style ) {
	if ( location === 'right' && bar_style === 'light-heavy' )
			return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_RIGHT;
}

function mxmlHarmony( xml_harmony ) {
	let harmony = '';
	let xml_root = xml_harmony.getElementsByTagName( 'root' )[0];
	let root_step = xml_root.getElementsByTagName( 'root-step' )[0].innerHTML;
	harmony = root_step;
	let root_alter = xml_root.getElementsByTagName( 'root-alter' );
	if ( root_alter.length )
		root_alter = parseInt( root_alter[0].innerHTML );
	else
		root_alter = 0;
	if ( root_alter === 0 )
		;
	else if ( root_alter === 1 )
		harmony += '#';
	else if ( root_alter === -1 )
		harmony += 'b';
	let kind = xml_harmony.getElementsByTagName( 'kind' )[0].innerHTML;
	let seventh_index = kind.lastIndexOf( '-seventh' );
	if ( seventh_index !== -1 )
		kind = kind.substr( 0, seventh_index );
	if ( kind === 'major' )
		;
	else if ( kind === 'minor' )
		harmony += 'm';
	else if ( kind === 'augmented' )
		harmony += 'aug';
	else if ( kind === 'diminished' )
		harmony += 'dim';
	else if ( kind === 'half-diminished' )
		;
	if ( seventh_index !== -1 )
		harmony += '7';
	// TODO beautify output
	return harmony;
}

function mxmlDuration( type ) {
	switch ( type ) {
		// maxima, long, 512th, 1024th types not present in Vex.Flow.durationToTicks.durations
		case 'breve':
			return '1/2';
		case 'whole':
			return 'w';
		case 'half':
			return 'h';
		case 'quarter':
			return 'q';
		case 'eighth':
			return '8';
		case '16th':
			return '16';
		case '32th':
			return '32';
		case '64th':
			return '64';
		case '128th':
			return '128';
		case '256th':
			return '256';
		default:
			return 'w';
	}
}

function mxmlPitch( xml_pitch ) {
	let alter = xml_pitch.getElementsByTagName( 'alter' );
	if ( alter.length )
		alter = parseInt( alter[0].innerHTML );
	else
		alter = 0;
	return {
		step: xml_pitch.getElementsByTagName( 'step' )[0].innerHTML.toLowerCase(),
		alter: alter,
		octave: parseInt( xml_pitch.getElementsByTagName( 'octave' )[0].innerHTML ),
	};
}

function mxmlAccidentalType( xml_accidental ) {
	// parentheses attribute is ignored
	switch ( xml_accidental.innerHTML ) {
		case 'double-flat':
			return 'bb';
		case 'flat':
			return 'b';
		case 'natural':
			return 'n';
		case 'sharp':
			return '#';
		case 'double-sharp':
			return '##';
	}
}

function mxmlBeam( element, part, voice, vf_note ) {
	let flag = false; // whether to end a beam
	for ( let xml_beam of element.getElementsByTagName( 'beam' ) ) {
		let number = xml_beam.getAttribute( 'number' );
		if ( number !== null )
			number = parseInt( number );
		else
			number = 1;
		if ( number === 1 ) {
			voice.beam.push( vf_note );
			let value = xml_beam.innerHTML;
			if ( value === 'end' )
				flag = true;
		}
	}
	if ( flag ) {
		part.vf_beams.push( new Vex.Flow.Beam( voice.beam ) );
		voice.beam = [];
	}
}

function mxmlTie( element, part, voice, vf_note, line ) {
	// do not tie a rest
	if ( element.getElementsByTagName( 'rest' ).length )
		return;
	// loop through every note in a chord
	let index = 0;
	do {
		// get an integer representing the absolute pitch of the tied note
		let pitch = element.getElementsByTagName( 'pitch' )[0];
		pitch = mxmlPitch( pitch );
		pitch = Vex.Flow.Music.NUM_TONES * pitch.octave +
			Vex.Flow.Music.root_values[Vex.Flow.Music.root_indices[pitch.step]] +
			pitch.alter;
		// note may have up to two ties of different type
		for ( let tie of element.getElementsByTagName( 'tie' ) ) {
			switch ( tie.getAttribute( 'type' ) ) {
				case 'start':
					// mark the start of the tie
					voice.ties[pitch] = {
						vf_note: vf_note,
						index: index,
						line: line,
					};
					break;
				case 'stop':
					// retrieve the start of the tie
					let tie_beg = voice.ties[pitch];
					delete voice.ties[pitch];
					// create a similar object for the stop of the tie
					let tie_end = {
						vf_note: vf_note,
						index: index,
						line: line,
					};
					if ( tie_beg.line === tie_end.line ) {
						// if the two ends are in the same line, add the tie
						part.vf_ties.push( new Vex.Flow.StaveTie( {
							first_note: tie_beg.vf_note,
							last_note: tie_end.vf_note,
							first_indices: [ tie_beg.index ],
							last_indices: [ tie_end.index ],
						} ) );
					} else {
						// else add a single ended tie per line
						part.vf_ties.push( new Vex.Flow.StaveTie( {
							first_note: tie_beg.vf_note,
							first_indices: [ tie_beg.index ],
						} ) );
						part.vf_ties.push( new Vex.Flow.StaveTie( {
							last_note: tie_end.vf_note,
							last_indices: [ tie_end.index ],
						} ) );
					}
					break;
			}
		}
		element = element.nextElementSibling;
		index++;
	} while ( element !== null && element.getElementsByTagName( 'chord' ).length );
}
