/*
 * part.id  . . . . . . . . . . . . . . . String
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
 * part.staves[].voices[].vf_beams  . . . Array
 * part.staves[].voices[].vf_beams[]  . . Vex.Flow.Beam
 * part.staves[].voices[].ties  . . . . . Object
 * part.staves[].voices[].ties[].vf_note  Vex.Flow.StaveNote
 * part.staves[].voices[].ties[].line . . int
 * part.staves[].voices[].ties[].index  . int
 * part.staves[].harmony  . . . . . . . . String
 * part.measures  . . . . . . . . . . . . int
 * part.vf_connectors . . . . . . . . . . Array
 * part.vf_connectors[] . . . . . . . . . Vex.Flow.StaveConnector
 * part.vf_ties . . . . . . . . . . . . . Array
 * part.vf_ties[] . . . . . . . . . . . . Vex.Flow.StaveTie
 */

let mxmlHttp = new XMLHttpRequest();
mxmlHttp.onreadystatechange = function() {
	if ( this.readyState = 4 && this.status === 200 && this.responseXML !== null )
		mxml( this.responseXML );
};
mxmlHttp.open( 'GET', mxml_file, true );
mxmlHttp.send();

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

function getBarType( bar_style ) {
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

function getBarLineConnectorType( location, bar_style ) {
	if ( location === 'right' && bar_style === 'light-heavy' )
			return Vex.Flow.StaveConnector.type.BOLD_DOUBLE_RIGHT;
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

function build_part_staves( part, options, state ) {
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
				clef: undefined,
				voices: {},
				harmony: undefined,
			};
		// shorthand to current stave
		let stave = part.staves[stave_cnt];
		// create vf_stave
		stave.vf_stave = new Vex.Flow.Stave( state.x, state.y, options.STAVE_WIDTH, stave_options );
		// add clef and key signature to the first stave of each line
		if ( state.x === options.LINE_INDENT && stave.clef !== undefined )
			mxmlStaveAddClef( stave );
		if ( state.x === options.LINE_INDENT && part.key !== null )
			stave.vf_stave.addKeySignature( part.key );
		// move state.y to the bottom of the current stave
		state.y += options.STAVE_HEIGHT;
	}
	// set part left text
	if ( state.x === options.LINE_INDENT ) {
		if ( part.staves.length === 1 ) {
			part.getStave(0).vf_stave.setText( state.line_cnt ? part.abbreviation : part.name, Vex.Flow.Modifier.Position.LEFT );
		} else {
			let connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
			connector.setType( Vex.Flow.StaveConnector.type.BRACE );
			connector.setText( state.line_cnt ? part.abbreviation : part.name, Vex.Flow.Modifier.Position.LEFT );
			part.vf_connectors.push( connector );
		}
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
}

function build_beam( element, voice, vf_note ) {
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
		voice.vf_beams.push( new Vex.Flow.Beam( voice.beam ) );
		voice.beam = [];
	}
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

function mxml( xml ) {
	let renderer = new Vex.Flow.Renderer( document.getElementById( 'xml' ), Vex.Flow.Renderer.Backends.SVG );
	let context = renderer.getContext();
	var line_width = document.getElementById( 'xml' ).offsetWidth - 20;

	var options = {
		LINE_INDENT:  200,
		STAVE_WIDTH:  250,
		STAVE_HEIGHT: 100,
		STAVE_MARGIN: 0,
		PART_MARGIN:  20,
		LINE_MARGIN:  100,
	};

	let score_partwise = xml.getElementsByTagName( 'score-partwise' )[0];
	var part_list = score_partwise.getElementsByTagName( 'part-list' )[0];
	// TODO part-group group-symbol (bracket)
	var xml_parts = score_partwise.getElementsByTagName( 'part' );
	var parts = [];
	for ( let part_cnt = 0; part_cnt < xml_parts.length; part_cnt++ ) {
		let xml_part = xml_parts[part_cnt];
		parts.push ( {
			id: xml_part.id,
			name: part_list.getElementsByTagName( 'score-part' )[xml_part.id].getElementsByTagName( 'part-name' )[0].innerHTML,
			abbreviation: part_list.getElementsByTagName( 'score-part' )[xml_part.id].getElementsByTagName( 'part-abbreviation' )[0].innerHTML,
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
			vf_ties: [],
		} );
	}

	var state = {
		x: options.LINE_INDENT,
		y: 20,
		top: 20,
		line_cnt: 0,
		part_cnt: 0,
	};

	var i = 0;
	var more = true;
	while ( true ) {
		// break if a part runs out of measures
		for ( let part of parts ) {
			if ( i >= part.measures ) {
				more = false;
				break;
			}
		}
		if ( !more )
			break;
		// measure horizontal position
		if ( state.x > options.LINE_INDENT && state.x + options.STAVE_WIDTH > line_width ) {
			state.line_cnt++;
			state.x = options.LINE_INDENT;
			state.top = state.y;
		} else {
			state.y = state.top;
		}
		// loop each part
		for ( state.part_cnt = 0; state.part_cnt < xml_parts.length; state.part_cnt++ ) {
			// shorthand to current part
			let part = parts[state.part_cnt];
			// build part staves in case they are initialized
			if ( part.staves.length )
				build_part_staves( part, options, state );
			// loop each measure element
			for ( let element of xml_parts[state.part_cnt].getElementsByTagName( 'measure' )[i].children ) {
				// TODO direction: metronome and dynamics
				if ( element.tagName === 'attributes' ) {
					// build part staves in case the are not initialized
					if ( !part.staves.length ) {
						if ( element.getElementsByTagName( 'staves' ).length )
							part.staves = new Array( parseInt( element.getElementsByTagName( 'staves' )[0].innerHTML ) );
						else
							part.staves = new Array( 1 );
						build_part_staves( part, options, state );
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
						let type = getBarLineConnectorType( location, bar_style );
						let connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
						connector.setType( type );
						part.vf_connectors.push( connector );
					} else if ( part.staves.length === 1 ) {
						let type = getBarType( bar_style );
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
							vf_beams: [],
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
						note.accidentals = [];
						let sibling = element;
						let index = 0;
						do {
							let pitch = mxmlPitch( sibling.getElementsByTagName( 'pitch' )[0] );
							note.keys.push( pitch.step + '/' + pitch.octave );
							let xml_accidentals = sibling.getElementsByTagName( 'accidental' );
							if ( xml_accidentals.length )
								note.accidentals.push( {
									index: index,
									type: mxmlAccidentalType( xml_accidentals[0] ),
								} );
							sibling = sibling.nextElementSibling;
							index++;
						} while ( sibling !== null && sibling.getElementsByTagName( 'chord' ).length );
						vf_note = new Vex.Flow.StaveNote( note );
						for ( let accidental of note.accidentals )
							vf_note.addAccidental( accidental.index, new Vex.Flow.Accidental( accidental.type ) );
						note.accidentals = undefined;
					}
					// beam
					build_beam( element, voice, vf_note );
					// tie
					if ( !element.getElementsByTagName( 'rest' ).length ) {
						let sibling = element;
						let index = 0;
						do {
							let pitch = mxmlPitch( sibling.getElementsByTagName( 'pitch' )[0] );
							pitch = Vex.Flow.Music.NUM_TONES * pitch.octave +
								Vex.Flow.Music.root_values[Vex.Flow.Music.root_indices[pitch.step]] +
								pitch.alter;
							for ( let tie of sibling.getElementsByTagName( 'tie' ) ) {
								switch ( tie.getAttribute( 'type' ) ) {
									case 'start':
										if ( !( pitch in voice.ties ) || voice.ties[pitch] === null )
											voice.ties[pitch] = {
												vf_note: vf_note,
												line: state.line_cnt,
												index: index,
											};
										break;
									case 'stop':
										let tie_beg = voice.ties[pitch];
										voice.ties[pitch] = null;
										let tie_end = {
											vf_note: vf_note,
											line: state.line_cnt,
											index: index,
										};
										if ( tie_beg.line === tie_end.line ) {
											part.vf_ties.push( new Vex.Flow.StaveTie( {
												first_note: tie_beg.vf_note,
												last_note: tie_end.vf_note,
												first_indices: [ tie_beg.index ],
												last_indices: [ tie_end.index ],
											} ) );
										} else {
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
							sibling = sibling.nextElementSibling;
							index++;
						} while ( sibling !== null && sibling.getElementsByTagName( 'chord' ).length );
					}
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
								vf_beams: [],
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
						if ( stave.harmony !== undefined ) {
							note.text = stave.harmony;
							stave.harmony = undefined;
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
		renderer.resize( line_width, state.y ); // TODO delete line
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
				new Vex.Flow.Formatter().joinVoices( vf_voices ).format( vf_voices, options.STAVE_WIDTH ); // TODO available width
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
					for ( let vf_beam of voice.vf_beams )
						vf_beam.setContext( context ).draw();
					voice.vf_beams = [];
				}
				stave.vf_stave = null;
			}
		}
		for ( let part of parts ) {
			for ( let vf_tie of part.vf_ties )
				vf_tie.setContext( context ).draw();
			part.vf_ties = [];
		}
		state.x += options.STAVE_WIDTH;
		i++;
	}
	
	renderer.resize( line_width, state.y + options.LINE_MARGIN );
}
