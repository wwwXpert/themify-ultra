<?php
/**
 * This file defines Custom Fonts
 *
 * Themify_Custom_Fonts class register post type for Custom Fonts and load them
 *
 *
 * @package    Themify_Builder
 * @subpackage Themify_Builder/classes
 */

if ( !class_exists( 'Themify_Custom_Fonts' ) ) {
	/**
	 * The Custom Fonts class.
	 *
	 * This class register post type for Custom Fonts and load them.
	 *
	 *
	 * @package    Themify_Builder
	 * @subpackage Themify_Builder/classes
	 * @author     Themify
	 */
	class Themify_Custom_Fonts
	{

		/**
		 * Post Type Custom Fonts Object.
		 *
		 * @access static
		 * @var object $customFont .
		 */
		static $customFont;

		/**
		 * API Url
		 *
		 * @access static
		 * @var object $customFont .
		 */
		static $api_url;

		/**
		 * Constructor
		 *
		 * @access public
		 */
		public function __construct() {
			self::$api_url = site_url( '/?tb_load_cf=' );
			self::register_cpt();
			if ( is_admin() ) {
				add_filter( 'themify_metaboxes', array( __CLASS__, 'meta_box' ) );
				add_filter( 'themify_metabox/fields/tm-cf', array( __CLASS__, 'meta_box_fields' ), 10, 2 );
				add_filter( 'upload_mimes', array( __CLASS__, 'upload_mimes' ), 1, 1 );
				add_action( 'admin_head', array( __CLASS__, 'clean_admin_listing_page' ) );
			}
			add_action( 'init', array( __CLASS__, 'load_fonts_api' ) );
			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_fonts' ), 30 );
		}

		/**
		 * Register Custom Font Custom Post Type
		 *
		 * @access static
		 */
		public static function register_cpt() {
			if ( !class_exists( 'CPT' ) ) {
				include THEMIFY_BUILDER_LIBRARIES_DIR . '/CPT.php';
			}

			// create a template custom post type
			self::$customFont = new CPT( array(
				'post_type_name' => 'tb_cf',
				'singular' => __( 'Custom Font', 'themify' ),
				'plural' => __( 'Custom Fonts', 'themify' )
			), array(
				'supports' => array( 'title' ),
				'exclude_from_search' => true,
				'show_in_nav_menus' => false,
				'show_in_menu' => false,
				'show_ui' => true,
				'public' => false,
				'has_archive' => false
			) );

			// define the columns to appear on the admin edit screen
			self::$customFont->columns( array(
				'cb' => '<input type="checkbox" />',
				'title' => __( 'Title', 'themify' ),
				'font_preview' => __( 'Preview', 'themify' )
			) );
		}

		public static function meta_box( $meta_boxes ) {
			$meta_boxes['tm-cf'] = array(
				'id' => 'tm-cf',
				'title' => __( 'Manage Font Files', 'themify' ),
				'context' => 'normal',
				'priority' => 'high',
				'screen' => array( self::$customFont->post_type_name ),
			);

			return $meta_boxes;
		}

		/**
		 * Setup the custom fields
		 *
		 * @return array
		 */
		public static function meta_box_fields( $fields ) {

			$fields['tm-cf'] = array(
				'name' => __( 'Font Variations', 'themify' ),
				'id' => 'tm-cf',
				'options' => array(
					array(
						'name' => 'variations',
						'type' => 'repeater',
						'show_first' => true,
						'add_new_label' => __( 'Add New Variation', 'themify' ),
						'fields' => array(
							array(
								'name' => 'weight',
								'title' => __( 'Weight', 'themify' ),
								'type' => 'dropdown',
								'meta' => array(
									array( 'value' => 'normal', 'name' => __( 'Normal', 'themify' ) ),
									array( 'value' => 'bold', 'name' => __( 'Bold', 'themify' ) ),
									array( 'value' => '100', 'name' => __( '100', 'themify' ) ),
									array( 'value' => '200', 'name' => __( '200', 'themify' ) ),
									array( 'value' => '300', 'name' => __( '300', 'themify' ) ),
									array( 'value' => '400', 'name' => __( '400', 'themify' ) ),
									array( 'value' => '500', 'name' => __( '500', 'themify' ) ),
									array( 'value' => '600', 'name' => __( '600', 'themify' ) ),
									array( 'value' => '700', 'name' => __( '700', 'themify' ) ),
									array( 'value' => '800', 'name' => __( '800', 'themify' ) ),
									array( 'value' => '900', 'name' => __( '900', 'themify' ) ),
								),
							),
							array(
								'name' => 'style',
								'title' => __( 'Style', 'themify' ),
								'type' => 'dropdown',
								'meta' => array(
									array( 'value' => 'normal', 'name' => __( 'Normal', 'themify' ) ),
									array( 'value' => 'italic', 'name' => __( 'Italic', 'themify' ) ),
									array( 'value' => 'oblique', 'name' => __( 'Oblique', 'themify' ) )
								)
							),
							array(
								'name' => 'woff',
								'ext' => 'woff',
								'title' => __( 'WOFF File', 'themify' ),
								'type' => 'font',
								'mime' => 'application/x-font-woff',
							),
							array(
								'name' => 'woff2',
								'ext' => 'woff2',
								'title' => __( 'WOFF2 File', 'themify' ),
								'type' => 'font',
								'mime' => 'application/x-font-woff2',
							),
							array(
								'name' => 'ttf',
								'ext' => 'ttf',
								'title' => __( 'TTF File', 'themify' ),
								'type' => 'font',
								'mime' => 'application/x-font-ttf',
							),
							array(
								'name' => 'svg',
								'ext' => 'svg',
								'title' => __( 'SVG File', 'themify' ),
								'type' => 'font',
								'mime' => 'image/svg+xml',
							),
							array(
								'name' => 'eot',
								'ext' => 'eot',
								'title' => __( 'EOT File', 'themify' ),
								'type' => 'font',
								'mime' => 'application/x-font-eot',
							),
							array(
								'name' => 'separator',
								'type' => 'separator',
							),
						),
					)
				),
			);

			return $fields;
		}

		public static function upload_mimes( $mine_types ) {
			$ext = array(
				'woff' => 'application/x-font-woff',
				'woff2' => 'application/x-font-woff2',
				'ttf' => 'application/x-font-ttf',
				'svg' => 'image/svg+xml',
				'eot' => 'application/x-font-eot'
			);
			foreach ( $ext as $type => $mine ) {
				if ( !isset( $mine_types[ $type ] ) ) {
					$mine_types[ $type ] = $mine;
				}
			}
			return $mine_types;
		}

		/**
		 * Clean up admin Font manager admin listing
		 */
		public static function clean_admin_listing_page() {
			global $typenow;

			if ( self::$customFont->post_type_name !== $typenow ) {
				return;
			}
			add_filter( 'months_dropdown_results', '__return_empty_array' );
			add_action( 'manage_' . self::$customFont->post_type_name . '_posts_custom_column', array( __CLASS__, 'render_columns' ), 10, 2 );
			add_filter( 'screen_options_show_screen', '__return_false' );
		}

		/**
		 * Render preview column in font manager admin listing
		 *
		 * @param $column
		 * @param $post_id
		 */
		public static function render_columns( $column, $post_id ) {
			if ( 'font_preview' === $column ) {
				$variations = get_post_meta( $post_id, 'variations', true );
				if ( empty( $variations ) ) {
					return;
				}
				$fonts = array(
					'woff' => 'woff',
					'woff2' => 'woff2',
					'ttf' => 'truetype',
					'svg' => 'svg',
					'eot' => 'embedded-opentype',
				);
				$font_family = get_the_title( $post_id );
				ob_start();
				foreach ( $variations as $var ):
					$src = '';
					foreach ( $fonts as $type => $format ) {
						$src .= !empty( $var[ $type ] ) ? 'url(\'' . $var[ $type ] . '\') format(\'' . $format . '\'),' : '';
					}
					?>
                    @font-face{font-family:'<?php echo $font_family; ?>';font-weight:<?php echo $var['weight']; ?>;font-style:<?php echo $var['style']; ?>;src:<?php echo rtrim( $src, ',' ); ?>;    }
				<?php
				endforeach;
				$font_face = ob_get_clean();
				printf( '<style>%s</style><span style="font-family: \'%s\';">%s</span>', trim( $font_face ), $font_family, __( 'Themify makes your dreams true.', 'themify' ) );
			}
		}

		/**
		 * Returns a list of Custom Fonts
		 * @return array
		 */
		public static function get_list( $env = 'builder' ) {
			$list = 'builder' !== $env ? array() : array(
				array( 'value' => '', 'name' => '' ),
				array(
					'value' => '',
					'name' => '--- ' . __( 'Custom Fonts', 'themify' ) . ' ---'
				)
			);
			$fonts = self::get_posts( array( 'limit' => -1 ) );
			foreach ( $fonts as $slug => $font ) {
				if ( !empty( $font['family'] ) && !empty( $font['variants'] ) ) {
					$list[] = array(
						'value' => $slug,
						'name' => $font['family'],
						'variant' => $font['variants']
					);
				}
			}
			return $list;
		}

		/**
		 * Returns a list of variants
		 * @return array
		 */
		public static function get_variants( $variants ) {
			$vars = array();
			if ( !empty( $variants ) && is_array( $variants ) ) {
				foreach ( $variants as $var ) {
					$vars[] = $var['weight'];
				}
				$vars = array_values( array_unique( $vars ) );
			}
			return $vars;
		}

		/**
		 * Get a list of Custom Fonts CPT
		 *
		 * @param array $args arguments of get posts
		 * @return array
		 */
		public static function get_posts( $args = array() ) {
			$limit = empty( $args['limit'] ) ? 10 : $args['limit'];
			$post_names = empty( $args['post_names'] ) ? array() : $args['post_names'];
			$cf_posts = array();
			$posts_args = array(
				'post_type' => 'tb_cf',
				'posts_per_page' => $limit,
				'post_name__in' => $post_names
			);
			$posts = get_posts( $posts_args );
			if ( $posts ) {
				foreach ( $posts as $post ) {
					setup_postdata( $post );
					$post_id = $post->ID;
					$data = get_post_meta( $post_id, 'variations', true );
					$cf_posts[ $post->post_name ] = array(
						'family' => $post->post_title,
						'variants' => self::get_variants( $data ),
						'data' => $data
					);
				}
				wp_reset_postdata();
			}
			return $cf_posts;
		}

		/**
		 * Custom Font API (similar to Google Font API) to load Font Face CSS
		 *
		 * @return void
		 */
		public static function load_fonts_api() {
			if ( !empty( $_GET['tb_load_cf'] ) ) {
				$font_css = '';
				$fonts = explode( '|', $_GET['tb_load_cf'] );
				foreach ( $fonts as $font ) {
					$font = explode( ':', $font );
					$font_family = $font[0];
					$variations = empty( $font[1] ) ? array() : explode( ',', $font[1] );
					$api_fonts[ $font_family ] = $variations;
				}
				if ( !empty( $api_fonts ) ) {
					$cf_fonts = self::get_posts( array( 'post_names' => array_keys( $api_fonts ), 'limit' => -1 ) );
					if ( !empty( $cf_fonts ) ) {
						foreach ( $api_fonts as $font_family => $variations ) {
							if ( empty( $cf_fonts[ $font_family ] ) ) {
								continue;
							}
							$variations = empty( $variations ) ? $cf_fonts[ $font_family ]['variants'] : $variations;
							foreach ( $variations as $var ) {
								foreach ( $cf_fonts[ $font_family ]['data'] as $K => $v ) {
									if ( $v['weight'] === $var ) {
										$font_css .= self::get_font_face_from_data( $font_family, $cf_fonts[ $font_family ]['data'][ $K ] ) . PHP_EOL;
										unset( $cf_fonts[ $font_family ]['data'][ $K ] );
										break;
									}
								}
							}
						}
					}
				}
				ob_start();
				header( 'Content-Type: text/css' );
				header( 'Expires: 0' );
				header( 'Cache-Control: must-revalidate, post-check=0, pre-check=0' );
				header( 'Cache-Control: private', false );
				header( 'Content-Transfer-Encoding: binary' );
				ob_clean();
				flush();
				echo $font_css;
				exit();
			}
		}

		/**
		 * Generate font-face CSS
		 *
		 * @param string $font_family
		 * @param array $data variations data
		 * @return string
		 */
		public static function get_font_face_from_data( $font_family, $data ) {
			$font_face = '';
			$src = array();
			$types = array( 'eot', 'woff2', 'woff', 'ttf', 'svg' );
			foreach ( $types as $type ) {
				if ( empty( $data[ $type ] ) ) {
					continue;
				}
				if ( 'svg' === $type ) {
					$data[ $type ] .= '#' . str_replace( ' ', '', $font_family );
				}

				$src[] = self::get_font_src_per_type( $type, $data[ $type ] );
			}
			if ( empty( $src ) ) {
				return $font_face;
			}
			$font_face = '@font-face {' . PHP_EOL;
			$font_face .= "\tfont-family: '" . $font_family . "';" . PHP_EOL;
			$font_face .= "\tfont-style: " . $data['style'] . ';' . PHP_EOL;
			$font_face .= "\tfont-weight: " . $data['weight'] . ';' . PHP_EOL;

			if ( !empty( $data['eot'] ) ) {
				$font_face .= "\tsrc: url('" . esc_attr( $data['eot'] ) . "');" . PHP_EOL;
			}

			$font_face .= "\tsrc: " . implode( ',' . PHP_EOL . "\t\t", $src ) . ';' . PHP_EOL . '}';

			return $font_face;
		}

		/**
		 * Generate font file src base on file type
		 *
		 * @param string $type font file type
		 * @param string $url font file url
		 * @return string
		 */
		public static function get_font_src_per_type( $type, $url ) {
			$src = 'url(\'' . esc_attr( $url ) . '\') ';
			switch ( $type ) {
				case 'woff':
				case 'woff2':
				case 'svg':
					$src .= 'format(\'' . $type . '\')';
					break;
				case 'ttf':
					$src .= 'format(\'truetype\')';
					break;
				case 'eot':
					$src = 'url(\'' . esc_attr( $url ) . '?#iefix\') format(\'embedded-opentype\')';
					break;
			}

			return $src;
		}

		/**
		 * Enqueues Custom Fonts (Builder)
		 */
		public static function get_fonts( $post_id = null ) {
			$entry_cf_fonts = get_option( 'themify_builder_cf_fonts' );
			$cf_fonts = array();
			if ( !empty( $entry_cf_fonts ) && is_array( $entry_cf_fonts ) ) {
				$entry_id = $post_id ? $post_id : Themify_Builder_Model::get_ID();
				if ( isset( $entry_cf_fonts[ $entry_id ] ) ) {
					$fonts = explode( '|', $entry_cf_fonts[ $entry_id ] );
					foreach ( $fonts as $font ) {
						if ( !empty( $font ) && !in_array( $font, Themify_Builder_Stylesheet::$isLoadedFonts, true ) ) {
							$cf_fonts[] = $font;
							Themify_Builder_Stylesheet::$isLoadedFonts[] = $font;
						}
					}
				}
			}
			return implode( '|', $cf_fonts );
		}

		/**
		 * Enqueue Custom fonts (if any) on the page (Customizer)
		 *
		 * @uses themify_custom_fonts filter
		 */
		public static function enqueue_fonts() {
			$fonts = apply_filters( 'themify_custom_fonts', array() );
			if ( !empty( $fonts ) ) {
				wp_enqueue_style( 'themify-custom-fonts', self::$api_url . implode( '|', $fonts ) );
			}
		}
	}
}
