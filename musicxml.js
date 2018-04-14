/*
 * part.id . . . . . . . . . . . . . . . String
 * part.name . . . . . . . . . . . . . . String
 * part.abbreviation . . . . . . . . . . String
 * part.staves . . . . . . . . . . . . . Array
 * part.staves[].vf_stave  . . . . . . . Vex.Flow.Stave
 * part.staves[].clef  . . . . . . . . . String
 * part.staves[].voices  . . . . . . . . Object
 * part.staves[].voices[].vf_voice . . . Vex.Flow.Voice
 * part.staves[].voices[].beams  . . . . Object
 * part.staves[].voices[].beams[]  . . . Array
 * part.staves[].voices[].beams[][]  . . Vex.Flow.StaveNote
 * part.staves[].voices[].ties . . . . . Object
 * part.staves[].voices[].ties[].vf_note Vex.Flow.StaveNote
 * part.staves[].voices[].ties[].line  . int
 * part.staves[].voices[].ties[].index . int
 * part.measures . . . . . . . . . . . . int
 * part.vf_connectors  . . . . . . . . . Array
 * part.vf_connectors[]  . . . . . . . . Vex.Flow.StaveConnector
 * part.vf_ties  . . . . . . . . . . . . Array
 * part.vf_ties[]. . . . . . . . . . . . Vex.Flow.StaveTie
 */

function parseKey( xml_key ) {
	var fifths = parseInt( xml_key.getElementsByTagName( 'fifths' )[0].innerHTML );
	for ( var key in Vex.Flow.keySignature.keySpecs ) {
		let keyspec = Vex.Flow.keySignature.keySpecs[key];
		if ( typeof keyspec !== 'object' || !( 'acc' in keyspec ) || !( 'num' in keyspec ) )
			continue;
		if ( fifths >= 0 && keyspec.acc === '#' && keyspec.num === fifths )
			return key;
		if ( fifths < 0 && keyspec.acc === 'b' && -keyspec.num === fifths )
			return key;
	}
}

function parseClef( xml_clef ) {
	var sign = xml_clef.getElementsByTagName( 'sign' )[0].innerHTML;
	var line = '';
	if ( xml_clef.getElementsByTagName( 'line' ).length )
		line = parseInt( xml_clef.getElementsByTagName( 'line' )[0].innerHTML );
	var clef_octave_change = '';
	if ( xml_clef.getElementsByTagName( 'clef-octave-change' ).length )
		clef_octave_change = parseInt( clef.getElementsByTagName( 'clef-octave-change' )[0].innerHTML );
	// TODO sign: TAB, jianpu, none
	// TODO clef-octave-change
	switch ( sign + line ) {
		case 'G1': return 'french';
		case 'G2': return 'treble';
		case 'C1': return 'soprano';
		case 'C2': return 'mezzo-soprano';
		case 'C3': return 'alto';
		case 'C4': return 'tenor';
		case 'C5': return 'baritone-c';
		case 'F3': return 'baritone-f';
		case 'F4': return 'bass';
		case 'F5': return 'subbass';
		case 'percussion': return 'percussion';
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

function parseDuration( type ) {
	switch ( type ) {
		// TODO maxima, long, 512th, 1024th
		case 'breve':   return '1/2';
		case 'whole':   return 'w';
		case 'half':    return 'h';
		case 'quarter': return 'q';
		case 'eighth':  return '8';
		case '16th':    return '16';
		case '32th':    return '32';
		case '64th':    return '64';
		case '128th':   return '128';
		case '256th':   return '256';
		default:        return 'h';
	}
}

function parsePitch( pitch ) {
	var step = pitch.getElementsByTagName( 'step' )[0].innerHTML;
	var octave = parseInt( pitch.getElementsByTagName( 'octave' )[0].innerHTML );
	return step + '/' + octave;
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
				clef: null,
				voices: {},
			};
		// shorthand to current stave
		let stave = part.staves[stave_cnt];
		// create vf_stave
		stave.vf_stave = new Vex.Flow.Stave( state.x, state.y, options.STAVE_WIDTH, stave_options );
		// add clef and key signature to the first stave of each line
		if ( state.x === options.LINE_INDENT && stave.clef !== null )
			stave.vf_stave.addClef( stave.clef );
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

let xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
	if ( this.readyState = 4 && this.status === 200 && this.responseXML !== null )
		parseXML( this.responseXML );
};
xhttp.open( 'GET', 'agioi.xml', true );
xhttp.send();

function parseXML( xml ) {
	let renderer = new Vex.Flow.Renderer( document.getElementById( 'xml' ), Vex.Flow.Renderer.Backends.SVG );
	var context = renderer.getContext();
	var line_width = document.getElementById( 'xml' ).offsetWidth - 20;

	var options = {
		LINE_INDENT:  200,
		STAVE_WIDTH:  250,
		STAVE_HEIGHT: 100,
		STAVE_MARGIN: 0,
		PART_MARGIN:  50,
		LINE_MARGIN:  100,
	};

	let score_partwise = xml.getElementsByTagName( 'score-partwise' )[0];
	var part_list = score_partwise.getElementsByTagName( 'part-list' )[0];
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
		y: 0,
		top: 0,
		line_cnt: 0,
		part_cnt: 0,
	};

	var i = 0;
	var more = true;
	while ( true ) {
		// break if a part run out of measures
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
			var part = parts[state.part_cnt];
			// build part staves in case they are initialized
			if ( part.staves.length )
				build_part_staves( part, options, state );
			// loop each measure element
			for ( var element of xml_parts[state.part_cnt].getElementsByTagName( 'measure' )[i].children ) {
				switch ( element.tagName ) {
					case 'attributes':
						// build part staves in case the are not initialized
						if ( !part.staves.length ) {
							if ( element.getElementsByTagName( 'staves' ).length )
								part.staves = new Array( parseInt( element.getElementsByTagName( 'staves' )[0].innerHTML ) );
							else
								part.staves = new Array( 1 );
							build_part_staves( part, options, state );
							// add clef to staves
							for ( let xml_clef of element.getElementsByTagName( 'clef' ) ) {
								let stave_cnt = xml_clef.getAttribute( 'number' );
								if ( stave_cnt !== null )
									stave_cnt = parseInt( stave_cnt ) - 1;
								else
									stave_cnt = 0;
								let stave = part.staves[stave_cnt];
								stave.clef = parseClef( xml_clef );
								stave.vf_stave.addClef( stave.clef );
							}
							// add key signature to staves
							if ( element.getElementsByTagName( 'key' ).length ) {
								part.key = parseKey( element.getElementsByTagName( 'key' )[0] );
								for ( let stave of part.staves )
									stave.vf_stave.addKeySignature( part.key );
							}
							// add time signature to staves
							if ( element.getElementsByTagName( 'time' ).length ) {
								// TODO common time and common time cut
								part.time = {
									num_beats: parseInt( element.getElementsByTagName( 'time' )[0].getElementsByTagName( 'beats' )[0].innerHTML ),
									beat_value: parseInt( element.getElementsByTagName( 'time' )[0].getElementsByTagName( 'beat-type' )[0].innerHTML ),
								};
								for ( let stave of part.staves )
									stave.vf_stave.addTimeSignature( part.time.num_beats + '/' + part.time.beat_value );
							}
						}
						break;
					case 'barline':
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
									// TODO middle
									break;
							}
						}
						break;
					case 'note':
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
								vf_voice: null,
								beams: {},
								ties: {},
							};
						voice = stave.voices[voice];
						if ( voice.vf_voice === null )
							voice.vf_voice = new Vex.Flow.Voice( part.time );
						// note objects
						let note = {};
						let vf_note;
						// duration
						if ( element.getElementsByTagName( 'type' ).length )
							note.duration = parseDuration( element.getElementsByTagName( 'type' )[0].innerHTML );
						else
							note.duration = parseDuration();
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
								; // TODO double stem
						}
						if ( element.getElementsByTagName( 'rest' ).length ) {
							note.duration += 'r';
							note.keys = [ 'r/4' ];
							vf_note = new Vex.Flow.StaveNote( note );
							// TODO center align whole measure rests
						} else {
							note.clef = stave.clef;
							note.keys = [];
							let sibling = element;
							do {
								note.keys.push( parsePitch( sibling.getElementsByTagName( 'pitch' )[0] ) );
								sibling = sibling.nextElementSibling;
							} while ( sibling !== null && sibling.getElementsByTagName( 'chord' ).length );
							// TODO accidentals https://usermanuals.musicxml.com/MusicXML/Content/EL-MusicXML-alter.htm
							vf_note = new Vex.Flow.StaveNote( note );
						}
						// beam
						if ( element.getElementsByTagName( 'beam' ).length ) {
							// TODO multiple beams
							let beam = element.getElementsByTagName( 'beam' )[0].getAttribute( 'number' );
							if ( !( beam in voice.beams ) )
								voice.beams[beam] = [];
							voice.beams[beam].push( vf_note );
						}
						// tie
						if ( !element.getElementsByTagName( 'rest' ).length ) {
							let sibling = element;
							let pos = 0;
							do {
								let pitch = parsePitch( sibling.getElementsByTagName( 'pitch' )[0] ); // TODO absolute pitch
								for ( let tie of element.getElementsByTagName( 'tie' ) ) {
									switch ( tie.getAttribute( 'type' ) ) {
										case 'start':
											if ( !( pitch in voice.ties ) || voice.ties[pitch] === null )
												voice.ties[pitch] = {
													vf_note: vf_note,
													line: state.line_cnt,
													index: pos,
												};
											break;
										case 'stop':
											let tie_beg = voice.ties[pitch];
											voice.ties[pitch] = null;
											let tie_end = {
												vf_note: vf_note,
												line: state.line_cnt,
												index: pos,
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
								pos++;
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
						break;
				}
			}
		}
		for ( let part of parts ) {
			for ( let stave of part.staves )
				stave.vf_stave.setContext( context ).draw();
			for ( let vf_connector of part.vf_connectors )
				vf_connector.setContext( context ).draw();
			part.vf_connectors = [];
		}
		let vf_voices = [];
		for ( let part of parts )
			for ( let stave of part.staves )
				for ( let voice_id in stave.voices )
					vf_voices.push( stave.voices[voice_id].vf_voice );
		let formatter = new Vex.Flow.Formatter().joinVoices( vf_voices ).format( vf_voices, options.STAVE_WIDTH );
		vf_voices = [];
		let vf_beams = [];
		for ( let part of parts ) {
			for ( let stave of part.staves ) {
				for ( let voice_id in stave.voices ) {
					let voice = stave.voices[voice_id];
					for ( let beam_id in voice.beams ) {
						let beam = voice.beams[beam_id];
						vf_beams.push( new Vex.Flow.Beam( beam ) );
						voice.beams = {};
					}
				}
			}
		}
		for ( let part of parts ) {
			for ( let stave of part.staves ) {
				for ( let voice_id in stave.voices ) {
					let voice = stave.voices[voice_id];
					voice.vf_voice.draw( context, stave.vf_stave );
					stave.voices[voice_id].vf_voice = null;
				}
				stave.vf_stave = null;
			}
		}
		for ( let vf_beam of vf_beams )
			vf_beam.setContext( context ).draw();
		vf_beams = [];
		for ( let part of parts ) {
			for ( let vf_tie of part.vf_ties )
				vf_tie.setContext( context ).draw();
			part.vf_ties = [];
		}
		state.x += options.STAVE_WIDTH;
		i++;
		renderer.resize( line_width, state.y ); // TODO delete line
	}
	
	renderer.resize( line_width, state.y );
}
